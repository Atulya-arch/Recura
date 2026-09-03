import { db } from '../db/index.js';
import { transactions, customers, recoveryCases, recoveryActions, aiDecisions, auditEvents, policies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { AIRecoveryService, CustomerHistory } from '../agents/aiRecoveryService.js';
import { PolicyEngine } from '../policies/policyEngine.js';
import { RecoveryExecutor } from './recoveryExecutor.js';
import { PaymentProvider } from '../providers/paymentProvider.js';
import { RecoveryStatus, RecoveryActionType, PaymentStatus } from '../../shared/enums.js';
import { RecoveryCase, Transaction, Customer, Policy } from '../../shared/types.js';

export class RecoveryEngine {
  private aiService: AIRecoveryService;
  private executor: RecoveryExecutor;

  constructor(private provider: PaymentProvider) {
    this.aiService = new AIRecoveryService();
    this.executor = new RecoveryExecutor(provider);
  }

  /**
   * Process a single transaction through the full recovery workflow
   */
  async processTransaction(transactionId: string): Promise<RecoveryCase | null> {
    // 1. DETECT: Fetch transaction & customer
    const [txRecord] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    if (!txRecord) return null;

    const [customerRecord] = await db.select().from(customers).where(eq(customers.id, txRecord.customerId));
    if (!customerRecord) return null;

    // Fetch merchant policy or default
    const [merchantPolicyRecord] = await db.select().from(policies).where(eq(policies.merchantId, txRecord.merchantId));
    const currentPolicy: Policy = merchantPolicyRecord
      ? {
          id: merchantPolicyRecord.id,
          merchantId: merchantPolicyRecord.merchantId,
          maxRetries: merchantPolicyRecord.maxRetries,
          maxRecoveryWindowHours: merchantPolicyRecord.maxRecoveryWindowHours,
          maxReminders: merchantPolicyRecord.maxReminders,
          maxAutomatedActions: merchantPolicyRecord.maxAutomatedActions,
          minimumAiConfidence: merchantPolicyRecord.minimumAiConfidence / 100,
          updatedAt: merchantPolicyRecord.updatedAt ? new Date(merchantPolicyRecord.updatedAt).toISOString() : new Date().toISOString()
        }
      : {
          id: `pol_default_${txRecord.merchantId}`,
          merchantId: txRecord.merchantId,
          ...PolicyEngine.DEFAULT_POLICY,
          updatedAt: new Date().toISOString()
        };

    const formattedTx: Transaction = {
      id: txRecord.id,
      merchantId: txRecord.merchantId,
      customerId: txRecord.customerId,
      orderId: txRecord.orderId,
      amountMinor: txRecord.amountMinor,
      currency: txRecord.currency,
      paymentStatus: txRecord.paymentStatus as PaymentStatus,
      failureReason: txRecord.failureReason,
      paymentMethod: txRecord.paymentMethod,
      checkoutStatus: txRecord.checkoutStatus as any,
      attemptCount: txRecord.attemptCount,
      createdAt: txRecord.createdAt ? new Date(txRecord.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: txRecord.updatedAt ? new Date(txRecord.updatedAt).toISOString() : new Date().toISOString()
    };

    const formattedCustomer: Customer = {
      id: customerRecord.id,
      merchantId: customerRecord.merchantId,
      name: customerRecord.name,
      email: customerRecord.email,
      phone: customerRecord.phone,
      optedOut: customerRecord.optedOut,
      createdAt: customerRecord.createdAt ? new Date(customerRecord.createdAt).toISOString() : new Date().toISOString()
    };

    // Check existing recovery case
    const [existingCase] = await db.select().from(recoveryCases).where(eq(recoveryCases.transactionId, transactionId));

    // Evaluate Deterministic Eligibility (Section 9)
    const eligibility = PolicyEngine.isEligible(
      formattedTx,
      formattedCustomer,
      existingCase ? (existingCase as any) : null,
      currentPolicy
    );

    const caseId = existingCase ? existingCase.id : `rc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!existingCase) {
      await db.insert(recoveryCases).values({
        id: caseId,
        transactionId: formattedTx.id,
        customerId: formattedTx.customerId,
        status: RecoveryStatus.DETECTED,
        recoveryEligible: eligibility.eligible,
        revenueAtRiskMinor: formattedTx.amountMinor,
        recoveredAmountMinor: 0,
        currentAttempt: 0,
        maxAttempts: currentPolicy.maxRetries
      });

      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        eventType: 'PAYMENT_FAILED',
        metadata: { failureReason: formattedTx.failureReason, amountMinor: formattedTx.amountMinor }
      });
    }

    if (!eligibility.eligible) {
      await db
        .update(recoveryCases)
        .set({ status: RecoveryStatus.STOPPED, recoveryEligible: false })
        .where(eq(recoveryCases.id, caseId));

      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        eventType: 'WORKFLOW_STOPPED',
        metadata: { reason: eligibility.reason }
      });

      const [updated] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));
      return updated as any;
    }

    // 2. DIAGNOSING: AI Diagnosis & Strategy Recommendation
    await db.update(recoveryCases).set({ status: RecoveryStatus.DIAGNOSING }).where(eq(recoveryCases.id, caseId));

    // Compute Customer History metrics
    const custTxs = await db.select().from(transactions).where(eq(transactions.customerId, formattedTx.customerId));
    const history: CustomerHistory = {
      previousSuccessfulPayments: custTxs.filter(t => t.paymentStatus === 'SUCCESS').length,
      previousFailures: custTxs.filter(t => t.paymentStatus === 'FAILED').length,
      previousRecoverySuccesses: 1 // Simulated
    };

    const aiResult = await this.aiService.diagnoseAndRecommend(formattedTx, formattedCustomer, history);

    if (aiResult.aiFailed || !aiResult.decision) {
      // AI Failure Handling (Section 16, 37)
      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        eventType: 'AI_FAILURE',
        metadata: { reason: aiResult.failureReason || 'Malformed AI response or timeout' }
      });

      await db
        .update(recoveryCases)
        .set({ status: RecoveryStatus.ESCALATED, updatedAt: new Date() })
        .where(eq(recoveryCases.id, caseId));

      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        eventType: 'ESCALATED',
        metadata: { reason: 'AI failure trigger safe escalation' }
      });

      const [escalatedCase] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));
      return escalatedCase as any;
    }

    const decision = aiResult.decision;

    // Save AI Decision
    const aiDecisionId = `aid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(aiDecisions).values({
      id: aiDecisionId,
      recoveryCaseId: caseId,
      diagnosis: decision.diagnosis,
      failureCategory: decision.failureCategory,
      recommendedAction: decision.recommendedAction,
      confidence: Math.round(decision.confidence * 100),
      rationale: decision.rationale
    });

    await db.insert(auditEvents).values({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recoveryCaseId: caseId,
      eventType: 'DIAGNOSIS_CREATED',
      metadata: { diagnosis: decision.diagnosis, failureCategory: decision.failureCategory }
    });

    await db.insert(auditEvents).values({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recoveryCaseId: caseId,
      eventType: 'AI_RECOMMENDATION',
      metadata: { recommendedAction: decision.recommendedAction, confidence: decision.confidence, rationale: decision.rationale }
    });

    // 3. POLICY_CHECK: Independent Policy Verification
    await db.update(recoveryCases).set({ status: RecoveryStatus.POLICY_CHECK }).where(eq(recoveryCases.id, caseId));

    const existingActions = await db.select().from(recoveryActions).where(eq(recoveryActions.recoveryCaseId, caseId));
    const [currentCaseRecord] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));

    const policyResult = PolicyEngine.evaluateAiRecommendation(
      { recommendedAction: decision.recommendedAction, confidence: decision.confidence },
      currentCaseRecord as any,
      existingActions as any,
      currentPolicy
    );

    let chosenAction = decision.recommendedAction;

    if (!policyResult.allowed) {
      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        eventType: 'POLICY_BLOCKED',
        metadata: { reason: policyResult.blockReason, attemptedAction: decision.recommendedAction }
      });

      chosenAction = policyResult.suggestedAction || RecoveryActionType.ESCALATE;
    } else {
      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        eventType: 'POLICY_CHECK',
        metadata: { status: 'PASSED', action: chosenAction }
      });
    }

    // 4. EXECUTING & VERIFYING
    await db.update(recoveryCases).set({ status: RecoveryStatus.EXECUTING }).where(eq(recoveryCases.id, caseId));

    const execution = await this.executor.executeApprovedAction(
      currentCaseRecord as any,
      chosenAction,
      existingActions as any,
      currentPolicy
    );

    // Save Action Record
    await db.insert(recoveryActions).values({
      id: execution.action.id,
      recoveryCaseId: execution.action.recoveryCaseId,
      actionType: execution.action.actionType,
      status: execution.action.status,
      idempotencyKey: execution.action.idempotencyKey,
      attemptNumber: execution.action.attemptNumber,
      scheduledAt: new Date(execution.action.scheduledAt),
      executedAt: execution.action.executedAt ? new Date(execution.action.executedAt) : null,
      result: execution.action.result
    });

    // Save Audit Events
    for (const evt of execution.auditEvents) {
      await db.insert(auditEvents).values({
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recoveryCaseId: caseId,
        actionId: evt.actionId || execution.action.id,
        eventType: evt.eventType!,
        metadata: evt.metadata || null
      });
    }

    // Update Recovery Case Status
    await db
      .update(recoveryCases)
      .set({
        status: execution.updatedCase.status,
        currentAttempt: execution.updatedCase.currentAttempt,
        recoveredAmountMinor: execution.updatedCase.recoveredAmountMinor,
        updatedAt: new Date()
      })
      .where(eq(recoveryCases.id, caseId));

    if (execution.updatedCase.recoveredAmountMinor > 0) {
      await db
        .update(transactions)
        .set({ paymentStatus: PaymentStatus.SUCCESS, updatedAt: new Date() })
        .where(eq(transactions.id, transactionId));
    }

    const [finalCase] = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId));
    return finalCase as any;
  }
}
