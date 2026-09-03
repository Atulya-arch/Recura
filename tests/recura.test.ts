import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../server/policies/policyEngine.js';
import { SimulationPaymentProvider } from '../server/providers/simulationProvider.js';
import { RecoveryExecutor } from '../server/services/recoveryExecutor.js';
import { AIRecoveryService } from '../server/agents/aiRecoveryService.js';
import { PaymentStatus, RecoveryStatus, RecoveryActionType, CustomerIntent } from '../shared/enums.js';
import { Transaction, Customer, RecoveryCase } from '../shared/types.js';

describe('Recura Core Business Logic & AI Tests', () => {
  let mockTransaction: Transaction;
  let mockCustomer: Customer;
  let mockCase: RecoveryCase;

  beforeEach(() => {
    mockTransaction = {
      id: 'tx_test_1',
      merchantId: 'mch_acme_retail',
      customerId: 'cust_1',
      orderId: 'ORD-100',
      amountMinor: 299900, // ₹2,999
      currency: 'INR',
      paymentStatus: PaymentStatus.FAILED,
      failureReason: 'Gateway network timeout',
      paymentMethod: 'CARD',
      checkoutStatus: 'FAILED',
      attemptCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockCustomer = {
      id: 'cust_1',
      merchantId: 'mch_acme_retail',
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      phone: '+919876543210',
      optedOut: false,
      createdAt: new Date().toISOString()
    };

    mockCase = {
      id: 'rc_test_1',
      transactionId: 'tx_test_1',
      customerId: 'cust_1',
      status: RecoveryStatus.DETECTED,
      recoveryEligible: true,
      revenueAtRiskMinor: 299900,
      recoveredAmountMinor: 0,
      currentAttempt: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  describe('Eligibility Rules', () => {
    it('should evaluate eligible case as true', () => {
      const result = PolicyEngine.isEligible(mockTransaction, mockCustomer);
      expect(result.eligible).toBe(true);
    });

    it('should evaluate opted-out customer as false', () => {
      mockCustomer.optedOut = true;
      const result = PolicyEngine.isEligible(mockTransaction, mockCustomer);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('opted out');
    });

    it('should evaluate already recovered case as false', () => {
      mockCase.recoveredAmountMinor = 299900;
      const result = PolicyEngine.isEligible(mockTransaction, mockCustomer, mockCase);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('already been successfully recovered');
    });
  });

  describe('Policy Engine Rules', () => {
    it('should allow retry if under retry limit', () => {
      const res = PolicyEngine.evaluateAiRecommendation(
        { recommendedAction: RecoveryActionType.IMMEDIATE_RETRY, confidence: 0.85 },
        mockCase,
        []
      );
      expect(res.allowed).toBe(true);
    });

    it('should block execution if AI confidence is below threshold', () => {
      const res = PolicyEngine.evaluateAiRecommendation(
        { recommendedAction: RecoveryActionType.IMMEDIATE_RETRY, confidence: 0.50 },
        mockCase,
        []
      );
      expect(res.allowed).toBe(false);
      expect(res.suggestedAction).toBe(RecoveryActionType.ESCALATE);
    });

    it('should block execution when max retries limit is reached', () => {
      const mockActions: any[] = [
        { actionType: RecoveryActionType.IMMEDIATE_RETRY, status: 'EXECUTED' },
        { actionType: RecoveryActionType.DELAYED_RETRY, status: 'EXECUTED' },
        { actionType: RecoveryActionType.DELAYED_RETRY, status: 'EXECUTED' }
      ];

      const res = PolicyEngine.evaluateAiRecommendation(
        { recommendedAction: RecoveryActionType.IMMEDIATE_RETRY, confidence: 0.90 },
        mockCase,
        mockActions
      );
      expect(res.allowed).toBe(false);
      expect(res.suggestedAction).toBe(RecoveryActionType.ESCALATE);
    });
  });

  describe('Idempotency Protection', () => {
    it('should prevent second execution with same idempotency key', async () => {
      const provider = new SimulationPaymentProvider();
      provider.setScenarioForTx(mockCase.transactionId, 'SUCCESS');
      const executor = new RecoveryExecutor(provider);

      const res1 = await executor.executeApprovedAction(mockCase, RecoveryActionType.IMMEDIATE_RETRY, []);
      expect(res1.action.status).toBe('EXECUTED');

      const res2 = await executor.executeApprovedAction(mockCase, RecoveryActionType.IMMEDIATE_RETRY, [res1.action]);
      expect(res2.action.status).toBe('DUPLICATE_BLOCKED');
      expect(res2.auditEvents.some(e => e.eventType === 'DUPLICATE_BLOCKED')).toBe(true);
    });
  });

  describe('Timeout Safety & Authoritative Verification', () => {
    it('should handle timeout by flagging UNKNOWN status and verifying authoritative state', async () => {
      const provider = new SimulationPaymentProvider();
      provider.setScenarioForTx(mockTransaction.id, 'TIMEOUT', PaymentStatus.SUCCESS);
      const executor = new RecoveryExecutor(provider);

      const res = await executor.executeApprovedAction(mockCase, RecoveryActionType.IMMEDIATE_RETRY, []);
      expect(res.auditEvents.some(e => e.eventType === 'PROVIDER_TIMEOUT')).toBe(true);
      expect(res.auditEvents.some(e => e.eventType === 'VERIFICATION')).toBe(true);
      expect(res.updatedCase.status).toBe(RecoveryStatus.RECOVERED);
    });
  });

  describe('Hinglish Voice & Promise-to-Pay (PTP) NLP Engine', () => {
    const aiService = new AIRecoveryService();
    const fixedBaseDate = new Date('2026-09-04T00:00:00.000Z');

    it('should extract specific salary date commitment from Hinglish text', async () => {
      const extraction = await aiService.extractPromiseToPay(
        'Bhaiya salary 7th ko aayegi, tab auto-retry kar lena',
        'Rahul Sharma',
        'ORD-100',
        '₹2,999',
        fixedBaseDate
      );
      expect(extraction.customerIntent).toBe(CustomerIntent.PAY_LATER);
      expect(extraction.promiseDate).not.toBeNull();
      expect(extraction.confidence).toBeGreaterThan(0.85);
      expect(extraction.hinglishReply).toContain('Rahul');
    });

    it('should handle immediate payment intent', async () => {
      const extraction = await aiService.extractPromiseToPay(
        'Main abhi pay karne ko ready hoon link bhej do',
        'Rahul Sharma',
        'ORD-100',
        '₹2,999',
        fixedBaseDate
      );
      expect(extraction.customerIntent).toBe(CustomerIntent.READY_NOW);
      expect(extraction.hinglishReply).toContain('http');
    });

    it('should handle cancellation intent', async () => {
      const extraction = await aiService.extractPromiseToPay(
        'Order cancel kar do mujhe nahi chahiye',
        'Rahul Sharma',
        'ORD-100',
        '₹2,999',
        fixedBaseDate
      );
      expect(extraction.customerIntent).toBe(CustomerIntent.CANCEL_ORDER);
      expect(extraction.promiseDate).toBeNull();
    });
  });
});
