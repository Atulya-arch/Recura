import { PaymentStatus, RecoveryStatus, FailureCategory, RecoveryActionType, CustomerIntent } from './enums.js';

export interface Merchant {
  id: string;
  name: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  optedOut: boolean;
}

export interface Transaction {
  id: string;
  merchantId: string;
  customerId: string;
  orderId: string;
  amountMinor: number; // Integer minor units (e.g. paise / cents)
  currency: string;
  paymentStatus: PaymentStatus;
  failureReason: string | null;
  paymentMethod: string;
  checkoutStatus: 'COMPLETED' | 'ABANDONED' | 'FAILED';
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryCase {
  id: string;
  transactionId: string;
  customerId: string;
  status: RecoveryStatus;
  recoveryEligible: boolean;
  revenueAtRiskMinor: number;
  recoveredAmountMinor: number;
  currentAttempt: number;
  maxAttempts: number;
  promiseToPayDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryAction {
  id: string;
  recoveryCaseId: string;
  actionType: RecoveryActionType;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'BLOCKED' | 'DUPLICATE_BLOCKED';
  idempotencyKey: string;
  attemptNumber: number;
  scheduledAt: string;
  executedAt: string | null;
  result: Record<string, any> | null;
  createdAt: string;
}

export interface AIDecision {
  id: string;
  recoveryCaseId: string;
  diagnosis: string;
  failureCategory: FailureCategory;
  recommendedAction: RecoveryActionType;
  confidence: number;
  rationale: string;
  hinglishScript?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  recoveryCaseId: string | null;
  actionId: string | null;
  eventType: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface Policy {
  id: string;
  merchantId: string;
  maxRetries: number;
  maxRecoveryWindowHours: number;
  maxReminders: number;
  maxAutomatedActions: number;
  minimumAiConfidence: number;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalTransactions: number;
  failedTransactions: number;
  revenueAtRiskMinor: number;
  recoveredRevenueMinor: number;
  recoveryRatePercent: number;
  incrementalRecoveryMinor: number;
  activeRecoveriesCount: number;
  stoppedSafelyCount: number;
  escalationsCount: number;
  outcomeDistribution: Record<string, number>;
  failureBreakdown: Record<string, number>;
}

export interface EvaluationResults {
  totalTransactions: number;
  failedTransactions: number;
  revenueAtRiskMinor: number;
  eligibleCasesCount: number;

  baseline: {
    recoveredRevenueMinor: number;
    recoveryRatePercent: number;
    successfulRecoveriesCount: number;
  };

  recura: {
    recoveredRevenueMinor: number;
    recoveryRatePercent: number;
    successfulRecoveriesCount: number;
    interventionsCount: number;
    stoppedWorkflowsCount: number;
    escalationsCount: number;
    failedWorkflowsCount: number;
  };

  incrementalRevenueMinor: number;
  incrementalRatePercent: number;
}
