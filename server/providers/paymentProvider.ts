import { PaymentStatus } from '../../shared/enums.js';

export interface PaymentRequest {
  transactionId: string;
  customerId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  idempotencyKey: string;
  attemptNumber: number;
}

export interface PaymentResult {
  success: boolean;
  status: PaymentStatus;
  providerTransactionId: string;
  rawResponse: Record<string, any>;
  errorMessage?: string;
}

export interface VerificationResult {
  verified: boolean;
  actualStatus: PaymentStatus;
  verifiedAt: string;
  details: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  retryPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  verifyPayment(transactionId: string, providerTransactionId?: string): Promise<VerificationResult>;
}
