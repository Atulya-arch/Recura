import { RecoveryActionType, PaymentStatus } from '../../shared/enums.js';
export class PolicyEngine {
    static DEFAULT_POLICY = {
        maxRetries: 3,
        maxRecoveryWindowHours: 72,
        maxReminders: 2,
        maxAutomatedActions: 3,
        minimumAiConfidence: 0.65
    };
    /**
     * Deterministic Eligibility Evaluator (Section 9)
     */
    static isEligible(transaction, customer, existingCase, policy = PolicyEngine.DEFAULT_POLICY) {
        // 1. Must be a failed payment or abandoned checkout
        if (transaction.paymentStatus !== PaymentStatus.FAILED && transaction.checkoutStatus !== 'ABANDONED') {
            return { eligible: false, reason: 'Transaction is not in FAILED or ABANDONED state' };
        }
        // 2. Amount must be positive
        if (transaction.amountMinor <= 0) {
            return { eligible: false, reason: 'Transaction amount is zero or negative' };
        }
        // 3. Customer must not have opted out
        if (customer.optedOut) {
            return { eligible: false, reason: 'Customer has opted out of automated recovery' };
        }
        // 4. Already recovered?
        if (existingCase && existingCase.recoveredAmountMinor > 0) {
            return { eligible: false, reason: 'Transaction has already been successfully recovered' };
        }
        // 5. Recovery window check (within N hours)
        const createdAt = new Date(transaction.createdAt).getTime();
        const windowMs = policy.maxRecoveryWindowHours * 60 * 60 * 1000;
        if (Date.now() - createdAt > windowMs) {
            return { eligible: false, reason: `Recovery window of ${policy.maxRecoveryWindowHours} hours expired` };
        }
        // 6. Max attempt count check
        if (transaction.attemptCount > policy.maxRetries) {
            return { eligible: false, reason: `Maximum attempt limit of ${policy.maxRetries} exceeded` };
        }
        return { eligible: true };
    }
    /**
     * Independent Policy Validation for AI Recommendations (Section 15)
     */
    static evaluateAiRecommendation(recommendation, recoveryCase, previousActions, policy = PolicyEngine.DEFAULT_POLICY) {
        // 1. Confidence check (supports both 65 and 0.65 formats)
        const minConfidenceFraction = policy.minimumAiConfidence > 1 ? policy.minimumAiConfidence / 100 : policy.minimumAiConfidence;
        if (recommendation.confidence < minConfidenceFraction) {
            return {
                allowed: false,
                blockReason: `AI confidence (${(recommendation.confidence * 100).toFixed(1)}%) is below merchant policy threshold (${(minConfidenceFraction * 100).toFixed(1)}%)`,
                suggestedAction: RecoveryActionType.ESCALATE
            };
        }
        // 2. Total automated actions limit
        const executedAutomatedActions = previousActions.filter(a => a.status === 'EXECUTED').length;
        if (executedAutomatedActions >= policy.maxAutomatedActions) {
            return {
                allowed: false,
                blockReason: `Maximum total automated actions limit (${policy.maxAutomatedActions}) reached`,
                suggestedAction: RecoveryActionType.ESCALATE
            };
        }
        // 3. Retry specific limit check
        if (recommendation.recommendedAction === RecoveryActionType.IMMEDIATE_RETRY || recommendation.recommendedAction === RecoveryActionType.DELAYED_RETRY) {
            const retriesDone = previousActions.filter(a => (a.actionType === RecoveryActionType.IMMEDIATE_RETRY || a.actionType === RecoveryActionType.DELAYED_RETRY) && a.status === 'EXECUTED').length;
            if (retriesDone >= policy.maxRetries) {
                return {
                    allowed: false,
                    blockReason: `Max payment retries limit (${policy.maxRetries}) reached (${retriesDone} retries already executed)`,
                    suggestedAction: RecoveryActionType.ESCALATE
                };
            }
        }
        // 4. Reminder specific limit check
        if (recommendation.recommendedAction === RecoveryActionType.REMINDER) {
            const remindersSent = previousActions.filter(a => a.actionType === RecoveryActionType.REMINDER && a.status === 'EXECUTED').length;
            if (remindersSent >= policy.maxReminders) {
                return {
                    allowed: false,
                    blockReason: `Max reminders limit (${policy.maxReminders}) reached (${remindersSent} reminders already sent)`,
                    suggestedAction: RecoveryActionType.ESCALATE
                };
            }
        }
        return { allowed: true };
    }
}
