import { RecoveryActionType, RecoveryStatus, PaymentStatus } from '../../shared/enums.js';
import { PolicyEngine } from '../policies/policyEngine.js';
export class RecoveryExecutor {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async executeApprovedAction(recoveryCase, actionType, existingActions, policy = PolicyEngine.DEFAULT_POLICY) {
        const attemptNumber = recoveryCase.currentAttempt + 1;
        const idempotencyKey = `rec_act_${recoveryCase.id}_att_${attemptNumber}_${actionType}`;
        const auditEvents = [];
        // 1. Idempotency Check (Section 13)
        const existingSameKey = existingActions.find(a => a.idempotencyKey === idempotencyKey);
        if (existingSameKey) {
            const blockedAction = {
                id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                recoveryCaseId: recoveryCase.id,
                actionType,
                status: 'DUPLICATE_BLOCKED',
                idempotencyKey,
                attemptNumber,
                scheduledAt: new Date().toISOString(),
                executedAt: new Date().toISOString(),
                result: { error: 'DUPLICATE_EXECUTION_ATTEMPT_PREVENTED' },
                createdAt: new Date().toISOString()
            };
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId: blockedAction.id,
                eventType: 'DUPLICATE_BLOCKED',
                metadata: { idempotencyKey, attemptNumber, actionType }
            });
            return {
                action: blockedAction,
                updatedCase: { ...recoveryCase, updatedAt: new Date().toISOString() },
                auditEvents
            };
        }
        // 2. Record action as PENDING
        const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const actionRecord = {
            id: actionId,
            recoveryCaseId: recoveryCase.id,
            actionType,
            status: 'PENDING',
            idempotencyKey,
            attemptNumber,
            scheduledAt: new Date().toISOString(),
            executedAt: null,
            result: null,
            createdAt: new Date().toISOString()
        };
        auditEvents.push({
            recoveryCaseId: recoveryCase.id,
            actionId,
            eventType: 'ACTION_CREATED',
            metadata: { actionType, idempotencyKey, attemptNumber }
        });
        // Handle ESCALATE action
        if (actionType === RecoveryActionType.ESCALATE) {
            actionRecord.status = 'EXECUTED';
            actionRecord.executedAt = new Date().toISOString();
            actionRecord.result = { outcome: 'ESCALATED_TO_MERCHANT' };
            const updatedCase = {
                ...recoveryCase,
                status: RecoveryStatus.ESCALATED,
                currentAttempt: attemptNumber,
                updatedAt: new Date().toISOString()
            };
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId,
                eventType: 'ESCALATED',
                metadata: { reason: 'Automation reached limits or low AI confidence' }
            });
            return { action: actionRecord, updatedCase, auditEvents };
        }
        // Handle REMINDER action
        if (actionType === RecoveryActionType.REMINDER) {
            actionRecord.status = 'EXECUTED';
            actionRecord.executedAt = new Date().toISOString();
            actionRecord.result = { outcome: 'REMINDER_SENT_TO_CUSTOMER' };
            const updatedCase = {
                ...recoveryCase,
                status: RecoveryStatus.RETRY_SCHEDULED,
                currentAttempt: attemptNumber,
                updatedAt: new Date().toISOString()
            };
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId,
                eventType: 'ACTION_EXECUTED',
                metadata: { actionType, outcome: 'REMINDER_SENT' }
            });
            return { action: actionRecord, updatedCase, auditEvents };
        }
        // 3. Execute retry through PaymentProvider
        const providerResult = await this.provider.retryPayment({
            transactionId: recoveryCase.transactionId,
            customerId: recoveryCase.customerId,
            amountMinor: recoveryCase.revenueAtRiskMinor,
            currency: 'INR',
            paymentMethod: 'CARD',
            idempotencyKey,
            attemptNumber
        });
        actionRecord.executedAt = new Date().toISOString();
        actionRecord.result = providerResult;
        auditEvents.push({
            recoveryCaseId: recoveryCase.id,
            actionId,
            eventType: 'ACTION_EXECUTED',
            metadata: { provider: this.provider.name, status: providerResult.status, result: providerResult }
        });
        // 4. Verification Step (Section 12: Timeout Safety)
        let verifiedStatus = providerResult.status;
        if (providerResult.status === PaymentStatus.UNKNOWN) {
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId,
                eventType: 'PROVIDER_TIMEOUT',
                metadata: { message: 'Provider returned UNKNOWN status due to timeout. Authoritative verification required.' }
            });
            const verification = await this.provider.verifyPayment(recoveryCase.transactionId, providerResult.providerTransactionId);
            verifiedStatus = verification.actualStatus;
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId,
                eventType: 'VERIFICATION',
                metadata: { verification }
            });
        }
        // 5. Decide Next State based on Verified Status
        let nextStatus = RecoveryStatus.FAILED;
        let recoveredAmountMinor = 0;
        if (verifiedStatus === PaymentStatus.SUCCESS) {
            actionRecord.status = 'EXECUTED';
            nextStatus = RecoveryStatus.RECOVERED;
            recoveredAmountMinor = recoveryCase.revenueAtRiskMinor;
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId,
                eventType: 'PAYMENT_RECOVERED',
                metadata: { recoveredAmountMinor }
            });
            auditEvents.push({
                recoveryCaseId: recoveryCase.id,
                actionId,
                eventType: 'WORKFLOW_STOPPED',
                metadata: { reason: 'SUCCESS' }
            });
        }
        else {
            actionRecord.status = 'FAILED';
            if (attemptNumber >= policy.maxRetries) {
                nextStatus = RecoveryStatus.STOPPED;
                auditEvents.push({
                    recoveryCaseId: recoveryCase.id,
                    actionId,
                    eventType: 'WORKFLOW_STOPPED',
                    metadata: { reason: 'MAX_RETRIES_EXCEEDED' }
                });
            }
            else {
                nextStatus = RecoveryStatus.RETRY_SCHEDULED;
                auditEvents.push({
                    recoveryCaseId: recoveryCase.id,
                    actionId,
                    eventType: 'RETRY_SCHEDULED',
                    metadata: { nextAttempt: attemptNumber + 1 }
                });
            }
        }
        const updatedCase = {
            ...recoveryCase,
            status: nextStatus,
            currentAttempt: attemptNumber,
            recoveredAmountMinor,
            updatedAt: new Date().toISOString()
        };
        return { action: actionRecord, updatedCase, auditEvents };
    }
}
