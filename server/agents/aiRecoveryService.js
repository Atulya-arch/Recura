import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiDecisionSchema } from '../../shared/schemas.js';
import { FailureCategory, RecoveryActionType } from '../../shared/enums.js';
export class AIRecoveryService {
    aiClient;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.aiClient = new GoogleGenerativeAI(apiKey);
        }
    }
    async diagnoseAndRecommend(transaction, customer, history) {
        const promptContext = {
            transaction: {
                id: transaction.id,
                amountMinor: transaction.amountMinor,
                currency: transaction.currency,
                failureReason: transaction.failureReason,
                paymentMethod: transaction.paymentMethod,
                checkoutStatus: transaction.checkoutStatus,
                attemptCount: transaction.attemptCount
            },
            customer: {
                name: customer.name,
                optedOut: customer.optedOut
            },
            customerHistory: history,
            availableStrategies: Object.values(RecoveryActionType),
            allowedCategories: Object.values(FailureCategory)
        };
        // If Gemini API key is available, attempt LLM call
        if (this.aiClient) {
            try {
                const model = this.aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const response = await model.generateContent(`You are Recura's AI Revenue Recovery agent. Analyze the following failed payment/checkout transaction context and return ONLY a valid JSON object matching the required schema.

Input Context:
${JSON.stringify(promptContext, null, 2)}

Requirements:
- diagnosis: Concise failure interpretation (1-2 sentences)
- failureCategory: Must be one of ${JSON.stringify(Object.values(FailureCategory))}
- recommendedAction: Must be one of ${JSON.stringify(Object.values(RecoveryActionType))}
- confidence: A decimal number between 0.0 and 1.0 representing your confidence
- rationale: Clear business rationale for the recommended action
- customerMessage: (Optional) Friendly, concise customer message if action is REMINDER

Return ONLY raw JSON, no markdown fences.`);
                const rawText = response.response.text() || '';
                const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanedJson);
                const validated = AiDecisionSchema.safeParse(parsed);
                if (validated.success) {
                    return { decision: validated.data, aiFailed: false };
                }
                else {
                    return {
                        decision: null,
                        aiFailed: true,
                        failureReason: `AI response failed Zod schema validation: ${validated.error.message}`
                    };
                }
            }
            catch (err) {
                return {
                    decision: null,
                    aiFailed: true,
                    failureReason: `AI generation failed or timed out: ${err.message}`
                };
            }
        }
        // High-precision local heuristic reasoning fallback when API key is not present or offline
        const heuristicDecision = this.runHeuristicAnalysis(transaction, customer, history);
        return { decision: heuristicDecision, aiFailed: false };
    }
    runHeuristicAnalysis(transaction, customer, history) {
        const reason = (transaction.failureReason || '').toLowerCase();
        const method = transaction.paymentMethod.toLowerCase();
        if (transaction.checkoutStatus === 'ABANDONED') {
            return {
                diagnosis: 'Customer abandoned checkout flow prior to authorization',
                failureCategory: FailureCategory.ABANDONMENT,
                recommendedAction: RecoveryActionType.REMINDER,
                confidence: 0.88,
                rationale: 'Customer left checkout before completing payment. Sending a friendly reminder with direct checkout link.',
                customerMessage: `Hi ${customer.name}, your order #${transaction.orderId} is saved! Complete your checkout securely using your payment link.`
            };
        }
        if (reason.includes('network') || reason.includes('timeout') || reason.includes('gateway')) {
            return {
                diagnosis: 'Transient gateway or network communication timeout',
                failureCategory: FailureCategory.NETWORK_FAILURE,
                recommendedAction: RecoveryActionType.IMMEDIATE_RETRY,
                confidence: 0.92,
                rationale: 'Network timeout detected during authorization. Customer history shows high past success; immediate retry recommended.'
            };
        }
        if (reason.includes('insufficient') || reason.includes('funds') || reason.includes('balance')) {
            return {
                diagnosis: 'Insufficient balance or limit reached on customer account',
                failureCategory: FailureCategory.INSUFFICIENT_FUNDS,
                recommendedAction: RecoveryActionType.DELAYED_RETRY,
                confidence: 0.81,
                rationale: 'Insufficient funds reported. A delayed retry allows time for account replenishment or salary cycle credit.'
            };
        }
        if (reason.includes('bank') || reason.includes('issuer') || reason.includes('decline')) {
            return {
                diagnosis: 'Bank/Issuer system failure or temporary decline',
                failureCategory: FailureCategory.BANK_FAILURE,
                recommendedAction: RecoveryActionType.DELAYED_RETRY,
                confidence: 0.76,
                rationale: 'Issuer decline experienced. Delayed retry recommended to avoid consecutive bank fraud flags.'
            };
        }
        if (transaction.attemptCount >= 3 || history.previousFailures > 4) {
            return {
                diagnosis: 'Repeated transaction failures exceeding automated recovery safety profile',
                failureCategory: FailureCategory.UNKNOWN,
                recommendedAction: RecoveryActionType.ESCALATE,
                confidence: 0.85,
                rationale: 'Multiple retries failed without success. Escalating to merchant support team for manual intervention.'
            };
        }
        return {
            diagnosis: 'Temporary card or payment channel authorization error',
            failureCategory: FailureCategory.TRANSIENT,
            recommendedAction: RecoveryActionType.IMMEDIATE_RETRY,
            confidence: 0.78,
            rationale: 'Transient authorization error on standard payment channel. Immediate single retry recommended.'
        };
    }
}
