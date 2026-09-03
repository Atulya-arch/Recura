import { PaymentProvider, PaymentRequest, PaymentResult, VerificationResult } from './paymentProvider.js';
import { PaymentStatus } from '../../shared/enums.js';

export type SimulationScenario =
  | 'SUCCESS'
  | 'PERMANENT_FAILURE'
  | 'TEMPORARY_FAILURE'
  | 'TIMEOUT'
  | 'DUPLICATE'
  | 'EVENTUAL_SUCCESS';

export class SimulationPaymentProvider implements PaymentProvider {
  name = 'SIMULATION';
  private executedKeys = new Set<string>();
  private simulatedTxStates = new Map<string, { status: PaymentStatus; scenario: SimulationScenario; verifiedStatus: PaymentStatus }>();

  public setScenarioForTx(txId: string, scenario: SimulationScenario, verifiedStatus: PaymentStatus = PaymentStatus.SUCCESS) {
    this.simulatedTxStates.set(txId, {
      status: PaymentStatus.PENDING,
      scenario,
      verifiedStatus
    });
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    return this.retryPayment(request);
  }

  async retryPayment(request: PaymentRequest): Promise<PaymentResult> {
    // 1. Idempotency Check
    if (this.executedKeys.has(request.idempotencyKey)) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        providerTransactionId: `sim_tx_${request.transactionId}_dup`,
        rawResponse: { error: 'DUPLICATE_IDEMPOTENCY_KEY', key: request.idempotencyKey },
        errorMessage: 'Duplicate action blocked by idempotency check'
      };
    }
    this.executedKeys.add(request.idempotencyKey);

    const configured = this.simulatedTxStates.get(request.transactionId);
    const scenario: SimulationScenario = configured?.scenario || this.inferScenarioFromTxId(request.transactionId, request.attemptNumber);

    if (scenario === 'TIMEOUT') {
      return {
        success: false,
        status: PaymentStatus.UNKNOWN,
        providerTransactionId: `sim_tx_${request.transactionId}_timeout`,
        rawResponse: { code: 'GATEWAY_TIMEOUT', message: 'Payment gateway timed out before response' },
        errorMessage: 'Gateway timed out. Status UNKNOWN.'
      };
    }

    if (scenario === 'SUCCESS') {
      return {
        success: true,
        status: PaymentStatus.SUCCESS,
        providerTransactionId: `sim_tx_${request.transactionId}_ok`,
        rawResponse: { code: 'PAYMENT_SUCCESS', amount: request.amountMinor }
      };
    }

    if (scenario === 'TEMPORARY_FAILURE') {
      if (request.attemptNumber >= 2) {
        return {
          success: true,
          status: PaymentStatus.SUCCESS,
          providerTransactionId: `sim_tx_${request.transactionId}_temp_ok`,
          rawResponse: { code: 'RETRY_SUCCESS', attempt: request.attemptNumber }
        };
      }
      return {
        success: false,
        status: PaymentStatus.FAILED,
        providerTransactionId: `sim_tx_${request.transactionId}_temp_fail`,
        rawResponse: { code: 'TRANSIENT_NETWORK_ERR' },
        errorMessage: 'Temporary network failure'
      };
    }

    if (scenario === 'EVENTUAL_SUCCESS') {
      if (request.attemptNumber >= 3) {
        return {
          success: true,
          status: PaymentStatus.SUCCESS,
          providerTransactionId: `sim_tx_${request.transactionId}_ev_ok`,
          rawResponse: { code: 'EVENTUAL_SUCCESS', attempt: request.attemptNumber }
        };
      }
      return {
        success: false,
        status: PaymentStatus.FAILED,
        providerTransactionId: `sim_tx_${request.transactionId}_ev_fail`,
        rawResponse: { code: 'INSUFFICIENT_FUNDS_TEMP' },
        errorMessage: 'Attempt failed, retry scheduled'
      };
    }

    if (scenario === 'PERMANENT_FAILURE') {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        providerTransactionId: `sim_tx_${request.transactionId}_perm_fail`,
        rawResponse: { code: 'ACCOUNT_CLOSED_OR_BLOCKED' },
        errorMessage: 'Permanent payment failure'
      };
    }

    // Default success fallback for normal retries
    return {
      success: true,
      status: PaymentStatus.SUCCESS,
      providerTransactionId: `sim_tx_${request.transactionId}_success`,
      rawResponse: { code: 'PAYMENT_SUCCESS' }
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    const configured = this.simulatedTxStates.get(transactionId);
    if (configured) {
      return configured.status;
    }
    return PaymentStatus.FAILED;
  }

  async verifyPayment(transactionId: string, providerTransactionId?: string): Promise<VerificationResult> {
    const configured = this.simulatedTxStates.get(transactionId);
    const actualStatus = configured?.verifiedStatus || PaymentStatus.SUCCESS;

    return {
      verified: true,
      actualStatus,
      verifiedAt: new Date().toISOString(),
      details: `Authoritative gateway verification completed for ${transactionId}. Confirmed status: ${actualStatus}`
    };
  }

  private inferScenarioFromTxId(txId: string, attempt: number): SimulationScenario {
    if (txId.includes('timeout')) return 'TIMEOUT';
    if (txId.includes('perm')) return 'PERMANENT_FAILURE';
    if (txId.includes('temp')) return 'TEMPORARY_FAILURE';
    if (txId.includes('ev')) return 'EVENTUAL_SUCCESS';
    return attempt > 1 ? 'SUCCESS' : 'TEMPORARY_FAILURE';
  }
}
