import { Router } from 'express';
import { db } from '../db/index.js';
import { transactions, customers, recoveryCases, recoveryActions, aiDecisions, auditEvents, policies } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { SimulationPaymentProvider } from '../providers/simulationProvider.js';
import { RecoveryEngine } from '../services/recoveryEngine.js';
import { EvaluationService } from '../services/evaluationService.js';
import { AIRecoveryService } from '../agents/aiRecoveryService.js';
import { UpdatePolicySchema, RunDemoScenarioSchema } from '../../shared/schemas.js';
import { RecoveryStatus, PaymentStatus, RecoveryActionType } from '../../shared/enums.js';

export const router = Router();
const simulationProvider = new SimulationPaymentProvider();
const recoveryEngine = new RecoveryEngine(simulationProvider);

// GET /api/dashboard/metrics
router.get('/dashboard/metrics', async (req, res) => {
  try {
    const allTxs = await db.select().from(transactions);
    const allCases = await db.select().from(recoveryCases);

    const totalTransactions = allTxs.length;
    const failedTxs = allTxs.filter(t => t.paymentStatus === 'FAILED' || t.checkoutStatus === 'ABANDONED');
    const failedTransactions = failedTxs.length;

    let revenueAtRiskMinor = 0;
    for (const t of failedTxs) revenueAtRiskMinor += t.amountMinor;

    let recoveredRevenueMinor = 0;
    for (const c of allCases) recoveredRevenueMinor += c.recoveredAmountMinor;

    const recoveryRatePercent = revenueAtRiskMinor > 0 ? Number(((recoveredRevenueMinor / revenueAtRiskMinor) * 100).toFixed(1)) : 0;
    const baselineRecovered = Math.round(recoveredRevenueMinor * 0.65); // Standard baseline estimate
    const incrementalRecoveryMinor = Math.max(0, recoveredRevenueMinor - baselineRecovered);

    const activeRecoveriesCount = allCases.filter(c => ['DETECTED', 'DIAGNOSING', 'PLANNED', 'POLICY_CHECK', 'READY', 'EXECUTING', 'VERIFYING', 'RETRY_SCHEDULED', 'PROMISE_TO_PAY'].includes(c.status)).length;
    const ptpCount = allCases.filter(c => c.status === 'PROMISE_TO_PAY').length;
    const stoppedSafelyCount = allCases.filter(c => c.status === 'STOPPED').length;
    const escalationsCount = allCases.filter(c => c.status === 'ESCALATED').length;

    const outcomeDistribution: Record<string, number> = {
      Recovered: allCases.filter(c => c.status === 'RECOVERED').length,
      'Promise To Pay': ptpCount,
      Pending: activeRecoveriesCount - ptpCount,
      Escalated: escalationsCount,
      Stopped: stoppedSafelyCount,
      Failed: allCases.filter(c => c.status === 'FAILED').length
    };

    const failureBreakdown: Record<string, number> = {};
    for (const t of failedTxs) {
      const key = t.failureReason ? t.failureReason.split(' ')[0] : 'Unknown';
      failureBreakdown[key] = (failureBreakdown[key] || 0) + 1;
    }

    res.json({
      totalTransactions,
      failedTransactions,
      revenueAtRiskMinor,
      recoveredRevenueMinor,
      recoveryRatePercent,
      incrementalRecoveryMinor,
      activeRecoveriesCount,
      ptpCount,
      stoppedSafelyCount,
      escalationsCount,
      outcomeDistribution,
      failureBreakdown
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions
router.get('/transactions', async (req, res) => {
  try {
    const list = await db
      .select({
        id: transactions.id,
        orderId: transactions.orderId,
        amountMinor: transactions.amountMinor,
        currency: transactions.currency,
        paymentStatus: transactions.paymentStatus,
        failureReason: transactions.failureReason,
        paymentMethod: transactions.paymentMethod,
        checkoutStatus: transactions.checkoutStatus,
        attemptCount: transactions.attemptCount,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        customerName: customers.name,
        customerEmail: customers.email,
        recoveryCaseId: recoveryCases.id,
        recoveryStatus: recoveryCases.status
      })
      .from(transactions)
      .innerJoin(customers, eq(transactions.customerId, customers.id))
      .leftJoin(recoveryCases, eq(transactions.id, recoveryCases.transactionId))
      .orderBy(desc(transactions.updatedAt), desc(transactions.createdAt))
      .limit(300);

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recovery-cases
router.get('/recovery-cases', async (req, res) => {
  try {
    const cases = await db
      .select({
        id: recoveryCases.id,
        transactionId: recoveryCases.transactionId,
        status: recoveryCases.status,
        recoveryEligible: recoveryCases.recoveryEligible,
        revenueAtRiskMinor: recoveryCases.revenueAtRiskMinor,
        recoveredAmountMinor: recoveryCases.recoveredAmountMinor,
        currentAttempt: recoveryCases.currentAttempt,
        maxAttempts: recoveryCases.maxAttempts,
        promiseToPayDate: recoveryCases.promiseToPayDate,
        createdAt: recoveryCases.createdAt,
        updatedAt: recoveryCases.updatedAt,
        customerName: customers.name,
        customerEmail: customers.email,
        orderId: transactions.orderId,
        failureReason: transactions.failureReason
      })
      .from(recoveryCases)
      .innerJoin(customers, eq(recoveryCases.customerId, customers.id))
      .innerJoin(transactions, eq(recoveryCases.transactionId, transactions.id))
      .orderBy(desc(recoveryCases.updatedAt))
      .limit(200);

    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recovery-cases/:id
router.get('/recovery-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [caseRec] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, id));

    if (!caseRec) {
      return res.status(404).json({ error: 'Recovery case not found' });
    }

    const [tx] = await db.select().from(transactions).where(eq(transactions.id, caseRec.transactionId));
    const [cust] = await db.select().from(customers).where(eq(customers.id, caseRec.customerId));
    const actions = await db.select().from(recoveryActions).where(eq(recoveryActions.recoveryCaseId, id)).orderBy(recoveryActions.attemptNumber);
    const [aiDec] = await db.select().from(aiDecisions).where(eq(aiDecisions.recoveryCaseId, id));
    const events = await db.select().from(auditEvents).where(eq(auditEvents.recoveryCaseId, id)).orderBy(desc(auditEvents.createdAt));

    res.json({
      recoveryCase: caseRec,
      transaction: tx,
      customer: cust,
      actions,
      aiDecision: aiDec || null,
      auditEvents: events
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recovery-cases/:id/execute
router.post('/recovery-cases/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const [recCase] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, id));

    if (!recCase) {
      return res.status(404).json({ error: 'Recovery case not found' });
    }

    const updated = await recoveryEngine.processTransaction(recCase.transactionId);
    res.json({ success: true, recoveryCase: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recovery-cases/:id/stop
router.post('/recovery-cases/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(recoveryCases).set({ status: RecoveryStatus.STOPPED, updatedAt: new Date().toISOString() }).where(eq(recoveryCases.id, id));

    await db.insert(auditEvents).values({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recoveryCaseId: id,
      eventType: 'WORKFLOW_STOPPED',
      metadata: { reason: 'MANUAL_MERCHANT_STOP' }
    });

    const [updated] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, id));
    res.json({ success: true, recoveryCase: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recovery-cases/:id/hinglish-negotiate (Promise-to-Pay NLP Extraction & Negotiation)
router.post('/recovery-cases/:id/hinglish-negotiate', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerReply } = req.body;

    if (!customerReply || typeof customerReply !== 'string') {
      return res.status(400).json({ error: 'customerReply text is required' });
    }

    const [recCase] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, id));
    if (!recCase) {
      return res.status(404).json({ error: 'Recovery case not found' });
    }

    const [tx] = await db.select().from(transactions).where(eq(transactions.id, recCase.transactionId));
    const [cust] = await db.select().from(customers).where(eq(customers.id, recCase.customerId));

    const amountFormatted = `₹${((recCase.revenueAtRiskMinor || tx.amountMinor) / 100).toLocaleString('en-IN')}`;

    // Run AI NLP Promise-to-Pay extraction
    const aiService = new AIRecoveryService();
    const extraction = await aiService.extractPromiseToPay(
      customerReply,
      cust ? cust.name : 'Customer',
      tx ? tx.orderId : 'ORD',
      amountFormatted
    );

    let newStatus = recCase.status;
    let promiseDateObj: Date | null = null;

    if (extraction.customerIntent === 'PAY_LATER' && extraction.promiseDate) {
      newStatus = RecoveryStatus.PROMISE_TO_PAY;
      promiseDateObj = new Date(extraction.promiseDate);

      await db.update(recoveryCases).set({
        status: newStatus,
        promiseToPayDate: promiseDateObj.toISOString(),
        updatedAt: new Date().toISOString()
      }).where(eq(recoveryCases.id, id));

      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: id,
        eventType: 'PROMISE_REGISTERED',
        metadata: {
          customerReply,
          customerIntent: extraction.customerIntent,
          promiseDate: extraction.promiseDate,
          daysDeferred: extraction.daysDeferred,
          confidence: extraction.confidence,
          summary: extraction.summary,
          hinglishReply: extraction.hinglishReply
        }
      });
    } else if (extraction.customerIntent === 'READY_NOW') {
      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: id,
        eventType: 'CUSTOMER_READY_PAY',
        metadata: {
          customerReply,
          summary: extraction.summary,
          hinglishReply: extraction.hinglishReply,
          paymentLink: `https://pay.recura.ai/checkout/${tx.orderId}`
        }
      });
    } else if (extraction.customerIntent === 'CANCEL_ORDER') {
      newStatus = RecoveryStatus.STOPPED;
      await db.update(recoveryCases).set({
        status: newStatus,
        updatedAt: new Date().toISOString()
      }).where(eq(recoveryCases.id, id));

      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: id,
        eventType: 'WORKFLOW_STOPPED',
        metadata: {
          reason: 'CUSTOMER_CANCELLED',
          customerReply,
          summary: extraction.summary
        }
      });
    }

    const [updated] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, id));
    res.json({
      success: true,
      extraction,
      recoveryCase: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit
router.get('/audit', async (req, res) => {
  try {
    const list = await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(300);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics
router.get('/analytics', async (req, res) => {
  try {
    const results = await EvaluationService.runBatchEvaluation();
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/policies
router.get('/policies', async (req, res) => {
  try {
    const [policy] = await db.select().from(policies);
    if (!policy) {
      return res.json({
        maxRetries: 3,
        maxRecoveryWindowHours: 72,
        maxReminders: 2,
        maxAutomatedActions: 3,
        minimumAiConfidencePercent: 65
      });
    }
    res.json({
      ...policy,
      minimumAiConfidencePercent: policy.minimumAiConfidence
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/policies
router.put('/policies', async (req, res) => {
  try {
    const body = UpdatePolicySchema.parse(req.body);
    const [existing] = await db.select().from(policies);

    if (existing) {
      await db.update(policies).set({
        maxRetries: body.maxRetries ?? existing.maxRetries,
        maxRecoveryWindowHours: body.maxRecoveryWindowHours ?? existing.maxRecoveryWindowHours,
        maxReminders: body.maxReminders ?? existing.maxReminders,
        maxAutomatedActions: body.maxAutomatedActions ?? existing.maxAutomatedActions,
        minimumAiConfidence: body.minimumAiConfidence ? Math.round(body.minimumAiConfidence * 100) : existing.minimumAiConfidence,
        updatedAt: new Date().toISOString()
      }).where(eq(policies.id, existing.id));
    } else {
      await db.insert(policies).values({
        id: `pol_${Date.now()}`,
        merchantId: 'mch_acme_retail',
        maxRetries: body.maxRetries ?? 3,
        maxRecoveryWindowHours: body.maxRecoveryWindowHours ?? 72,
        maxReminders: body.maxReminders ?? 2,
        maxAutomatedActions: body.maxAutomatedActions ?? 3,
        minimumAiConfidence: body.minimumAiConfidence ? Math.round(body.minimumAiConfidence * 100) : 65,
        updatedAt: new Date().toISOString()
      });
    }

    const [updated] = await db.select().from(policies);
    res.json({ success: true, policy: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/simulation/run (Demo Scenarios - Section 30)
router.post('/simulation/run', async (req, res) => {
  try {
    const { scenario } = RunDemoScenarioSchema.parse(req.body);

    // Create custom demo transaction
    const demoCustId = 'cust_demo_1';
    const [cust] = await db.select().from(customers).where(eq(customers.id, demoCustId));
    if (!cust) {
      await db.insert(customers).values({
        id: demoCustId,
        merchantId: 'mch_acme_retail',
        name: 'Rahul Sharma (Demo)',
        email: 'rahul.demo@example.com',
        phone: '+919876543210',
        optedOut: false
      });
    }

    const demoTxId = `tx_demo_${scenario.toLowerCase()}_${Date.now()}`;
    await db.insert(transactions).values({
      id: demoTxId,
      merchantId: 'mch_acme_retail',
      customerId: demoCustId,
      orderId: `ORD-DEMO-${scenario}`,
      amountMinor: 299900, // ₹2,999
      currency: 'INR',
      paymentStatus: PaymentStatus.FAILED,
      failureReason: scenario === 'TIMEOUT' ? 'Gateway timeout error' : 'Temporary bank network failure',
      paymentMethod: 'UPI',
      checkoutStatus: 'FAILED',
      attemptCount: scenario === 'RETRY_LIMIT' ? 3 : 1
    });

    if (scenario === 'TIMEOUT') {
      simulationProvider.setScenarioForTx(demoTxId, 'TIMEOUT', PaymentStatus.SUCCESS);
    } else if (scenario === 'SUCCESS') {
      simulationProvider.setScenarioForTx(demoTxId, 'TEMPORARY_FAILURE', PaymentStatus.SUCCESS);
    } else if (scenario === 'DUPLICATE') {
      simulationProvider.setScenarioForTx(demoTxId, 'DUPLICATE');
    }

    // Run Recovery Engine
    const resultCase = await recoveryEngine.processTransaction(demoTxId);

    // If DUPLICATE scenario, trigger second immediate run to prove duplicate prevention
    if (scenario === 'DUPLICATE' && resultCase) {
      await recoveryEngine.processTransaction(demoTxId);
    }

    res.json({
      success: true,
      scenario,
      demoTransactionId: demoTxId,
      recoveryCase: resultCase
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/evaluation/run
router.post('/evaluation/run', async (req, res) => {
  try {
    const results = await EvaluationService.runBatchEvaluation();
    res.json({ success: true, evaluation: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
