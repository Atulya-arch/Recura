import { db } from '../db/index.js';
import { transactions, customers, policies } from '../db/schema.js';
import { RecoveryEngine } from './recoveryEngine.js';
import { SimulationPaymentProvider } from '../providers/simulationProvider.js';
import { PolicyEngine } from '../policies/policyEngine.js';
import { AIRecoveryService } from '../agents/aiRecoveryService.js';
import { PaymentStatus } from '../../shared/enums.js';
export class EvaluationService {
    static cachedResults = null;
    static lastEvaluatedAt = 0;
    /**
     * Runs Recura Recovery Workflow across all eligible failed transactions
     * and computes dynamic metrics against a standard single-retry baseline.
     */
    static async runBatchEvaluation(forceRefresh = false) {
        const now = Date.now();
        // Use short-lived in-memory cache (15s) to guarantee sub-millisecond response times
        if (!forceRefresh && this.cachedResults && now - this.lastEvaluatedAt < 15000) {
            return this.cachedResults;
        }
        const allTxs = await db.select().from(transactions);
        const allCusts = await db.select().from(customers);
        const custMap = new Map();
        for (const c of allCusts) {
            custMap.set(c.id, {
                id: c.id,
                merchantId: c.merchantId,
                name: c.name,
                email: c.email,
                phone: c.phone,
                optedOut: c.optedOut,
                createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()
            });
        }
        const failedTxs = allTxs.filter(t => t.paymentStatus === 'FAILED' || t.checkoutStatus === 'ABANDONED');
        const totalTransactions = allTxs.length;
        const failedTransactions = failedTxs.length;
        let revenueAtRiskMinor = 0;
        const eligibleTxIds = [];
        const merchantPolicyRecord = (await db.select().from(policies))[0];
        const defaultPol = merchantPolicyRecord
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
                id: 'default',
                merchantId: 'mch_acme_retail',
                ...PolicyEngine.DEFAULT_POLICY,
                updatedAt: new Date().toISOString()
            };
        for (const tx of failedTxs) {
            const cust = custMap.get(tx.customerId);
            if (!cust)
                continue;
            const formattedTx = {
                id: tx.id,
                merchantId: tx.merchantId,
                customerId: tx.customerId,
                orderId: tx.orderId,
                amountMinor: tx.amountMinor,
                currency: tx.currency,
                paymentStatus: tx.paymentStatus,
                failureReason: tx.failureReason,
                paymentMethod: tx.paymentMethod,
                checkoutStatus: tx.checkoutStatus,
                attemptCount: tx.attemptCount,
                createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
                updatedAt: tx.updatedAt ? new Date(tx.updatedAt).toISOString() : new Date().toISOString()
            };
            const check = PolicyEngine.isEligible(formattedTx, cust, null, defaultPol);
            if (check.eligible) {
                revenueAtRiskMinor += tx.amountMinor;
                eligibleTxIds.push(tx.id);
            }
        }
        // 1. Run Baseline (Naive retry on every eligible failed transaction once)
        const baselineProvider = new SimulationPaymentProvider();
        let baselineRecoveredMinor = 0;
        let baselineSuccessCount = 0;
        for (const txId of eligibleTxIds) {
            const tx = failedTxs.find(t => t.id === txId);
            // Naive retry
            const res = await baselineProvider.retryPayment({
                transactionId: tx.id,
                customerId: tx.customerId,
                amountMinor: tx.amountMinor,
                currency: 'INR',
                paymentMethod: tx.paymentMethod,
                idempotencyKey: `base_${tx.id}_1`,
                attemptNumber: 1
            });
            if (res.status === PaymentStatus.SUCCESS) {
                baselineRecoveredMinor += tx.amountMinor;
                baselineSuccessCount++;
            }
        }
        const baselineRecoveryRate = revenueAtRiskMinor > 0 ? (baselineRecoveredMinor / revenueAtRiskMinor) * 100 : 0;
        // 2. Run Recura AI Recovery Engine with fast deterministic evaluator for batch simulation
        const recuraProvider = new SimulationPaymentProvider();
        const engine = new RecoveryEngine(recuraProvider, new AIRecoveryService(true));
        let recuraRecoveredMinor = 0;
        let recuraSuccessCount = 0;
        let interventionsCount = 0;
        let stoppedCount = 0;
        let escalationsCount = 0;
        let failedCount = 0;
        for (const txId of eligibleTxIds) {
            let recCase = await engine.processTransaction(txId);
            // If retry is scheduled, run subsequent automated attempts up to maxRetries
            while (recCase && recCase.status === 'RETRY_SCHEDULED' && recCase.currentAttempt < recCase.maxAttempts) {
                recCase = await engine.processTransaction(txId);
            }
            if (recCase) {
                interventionsCount++;
                if (recCase.recoveredAmountMinor > 0) {
                    recuraRecoveredMinor += recCase.recoveredAmountMinor;
                    recuraSuccessCount++;
                }
                if (recCase.status === 'STOPPED')
                    stoppedCount++;
                if (recCase.status === 'ESCALATED')
                    escalationsCount++;
                if (recCase.status === 'FAILED')
                    failedCount++;
            }
        }
        const recuraRecoveryRate = revenueAtRiskMinor > 0 ? (recuraRecoveredMinor / revenueAtRiskMinor) * 100 : 0;
        const incrementalRevenueMinor = Math.max(0, recuraRecoveredMinor - baselineRecoveredMinor);
        const incrementalRatePercent = recuraRecoveryRate - baselineRecoveryRate;
        const results = {
            totalTransactions,
            failedTransactions,
            revenueAtRiskMinor,
            eligibleCasesCount: eligibleTxIds.length,
            baseline: {
                recoveredRevenueMinor: baselineRecoveredMinor,
                recoveryRatePercent: Number(baselineRecoveryRate.toFixed(2)),
                successfulRecoveriesCount: baselineSuccessCount
            },
            recura: {
                recoveredRevenueMinor: recuraRecoveredMinor,
                recoveryRatePercent: Number(recuraRecoveryRate.toFixed(2)),
                successfulRecoveriesCount: recuraSuccessCount,
                interventionsCount,
                stoppedWorkflowsCount: stoppedCount,
                escalationsCount,
                failedWorkflowsCount: failedCount
            },
            incrementalRevenueMinor,
            incrementalRatePercent: Number(incrementalRatePercent.toFixed(2))
        };
        this.cachedResults = results;
        this.lastEvaluatedAt = now;
        return results;
    }
}
