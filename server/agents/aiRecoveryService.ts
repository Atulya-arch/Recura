import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiDecisionSchema, AiDecisionInput, PromiseToPayExtraction, PromiseToPayExtractionSchema } from '../../shared/schemas.js';
import { FailureCategory, RecoveryActionType, CustomerIntent } from '../../shared/enums.js';
import { Transaction, Customer } from '../../shared/types.js';

export interface CustomerHistory {
  previousSuccessfulPayments: number;
  previousFailures: number;
  previousRecoverySuccesses: number;
}

export class AIRecoveryService {
  private aiClient?: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.aiClient = new GoogleGenerativeAI(apiKey);
    }
  }

  async diagnoseAndRecommend(
    transaction: Transaction,
    customer: Customer,
    history: CustomerHistory
  ): Promise<{ decision: AiDecisionInput | null; aiFailed: boolean; failureReason?: string }> {
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
        const response = await model.generateContent(
          `You are Recura's AI Revenue Recovery agent. Analyze the following failed payment/checkout transaction context and return ONLY a valid JSON object matching the required schema.

Input Context:
${JSON.stringify(promptContext, null, 2)}

Requirements:
- diagnosis: Concise failure interpretation (1-2 sentences)
- failureCategory: Must be one of ${JSON.stringify(Object.values(FailureCategory))}
- recommendedAction: Must be one of ${JSON.stringify(Object.values(RecoveryActionType))}
- confidence: A decimal number between 0.0 and 1.0 representing your confidence
- rationale: Clear business rationale for the recommended action
- customerMessage: Friendly, concise English customer message
- hinglishScript: Polite, conversational Hinglish voice/SMS script for Indian customers (e.g. "Namaste Rahul ji! Acme Retail par aapka ₹... payment...")

Return ONLY raw JSON, no markdown fences.`
        );

        const rawText = response.response.text() || '';
        const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        const validated = AiDecisionSchema.safeParse(parsed);

        if (validated.success) {
          return { decision: validated.data, aiFailed: false };
        } else {
          return {
            decision: null,
            aiFailed: true,
            failureReason: `AI response failed Zod schema validation: ${validated.error.message}`
          };
        }
      } catch (err: any) {
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

  /**
   * Natural Language Promise-to-Pay (PTP) Intent & Date Extractor
   */
  async extractPromiseToPay(
    customerReply: string,
    customerName: string,
    orderId: string,
    amountFormatted: string,
    baseDate: Date = new Date()
  ): Promise<PromiseToPayExtraction> {
    const text = customerReply.trim().toLowerCase();

    // If Gemini client is active, attempt intelligent LLM parsing
    if (this.aiClient) {
      try {
        const model = this.aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are Recura's Promise-to-Pay (PTP) NLP parser for Indian merchant checkout recovery.
Base Today Date: ${baseDate.toISOString()}
Customer Reply: "${customerReply}"

Extract the customer's intent, the promised payment date (ISO format string), the days deferred, confidence, and a polite Hinglish confirmation message.

Schema Requirements:
- customerIntent: One of ["PAY_LATER", "READY_NOW", "CANCEL_ORDER", "DISPUTE"]
- promiseDate: ISO date string for future payment date, or null
- daysDeferred: integer between 0 and 30
- confidence: number between 0 and 1
- summary: concise English summary
- hinglishReply: polite Hinglish confirmation message to the customer

Return ONLY raw JSON matching this schema.`;

        const res = await model.generateContent(prompt);
        const raw = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(raw);
        const validated = PromiseToPayExtractionSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
      } catch (err) {
        console.warn('Gemini PTP extraction fallback to heuristic engine:', err);
      }
    }

    // Intelligent Deterministic Hinglish/English PTP Parser
    return this.parsePTPHeuristic(text, customerName, amountFormatted, baseDate);
  }

  private parsePTPHeuristic(
    text: string,
    customerName: string,
    amountFormatted: string,
    baseDate: Date
  ): PromiseToPayExtraction {
    // 1. Cancel intent
    if (text.includes('cancel') || text.includes('nahi chahiye') || text.includes('mat bhejo')) {
      return {
        customerIntent: CustomerIntent.CANCEL_ORDER,
        promiseDate: null,
        daysDeferred: 0,
        confidence: 0.95,
        summary: 'Customer requested order cancellation.',
        hinglishReply: `Ji ${customerName}, aapka order cancel kar diya gaya hai. Aage kisi bhi help ke liye batayein.`
      };
    }

    // 2. Ready now intent
    if (text.includes('abhi') || text.includes('now') || text.includes('link bhej') || text.includes('ready')) {
      return {
        customerIntent: CustomerIntent.READY_NOW,
        promiseDate: baseDate.toISOString(),
        daysDeferred: 0,
        confidence: 0.92,
        summary: 'Customer is ready to pay immediately via payment link.',
        hinglishReply: `Dhanyawad ${customerName}! Yeh raha aapka instant secure payment link: https://pay.recura.ai/checkout/${Date.now().toString(36)}`
      };
    }

    // 3. Date / Salary / Specific day detection
    let daysDeferred = 3;
    let specificDateStr = '';

    // Check specific day numbers: e.g. "7th", "7 tareekh", "10 ko", "5th ko", "1st"
    const dayMatch = text.match(/(\d{1,2})\s*(?:st|nd|rd|th|tareekh|tarikh|ko|\/|-)/i) || text.match(/(?:on\s*)(\d{1,2})/i);
    if (dayMatch) {
      const targetDay = parseInt(dayMatch[1], 10);
      if (targetDay >= 1 && targetDay <= 31) {
        const promise = new Date(baseDate);
        if (targetDay > baseDate.getDate()) {
          promise.setDate(targetDay);
        } else {
          promise.setMonth(promise.getMonth() + 1);
          promise.setDate(targetDay);
        }
        daysDeferred = Math.max(1, Math.round((promise.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
        specificDateStr = promise.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        return {
          customerIntent: CustomerIntent.PAY_LATER,
          promiseDate: promise.toISOString(),
          daysDeferred: Math.min(30, daysDeferred),
          confidence: 0.94,
          summary: `Customer committed Promise-to-Pay on ${specificDateStr} (salary/funds credit).`,
          hinglishReply: `Shukriya ${customerName}! Humne aapka ${amountFormatted} ka payment ${specificDateStr} ke liye guard karke schedule kar diya hai.`
        };
      }
    }

    // Check relative day terms: "kal" (tomorrow), "parso" (in 2 days), "salary", "next week"
    if (text.includes('kal') || text.includes('tomorrow')) {
      daysDeferred = 1;
    } else if (text.includes('parso') || text.includes('in 2 days')) {
      daysDeferred = 2;
    } else if (text.includes('salary') || text.includes('month end')) {
      daysDeferred = 4;
    } else if (text.includes('next week') || text.includes('agle hafte')) {
      daysDeferred = 7;
    }

    const scheduledDate = new Date(baseDate.getTime() + daysDeferred * 24 * 60 * 60 * 1000);
    const dateFormatted = scheduledDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    return {
      customerIntent: CustomerIntent.PAY_LATER,
      promiseDate: scheduledDate.toISOString(),
      daysDeferred,
      confidence: 0.89,
      summary: `Customer committed Promise-to-Pay on ${dateFormatted} (${daysDeferred} days deferred).`,
      hinglishReply: `Shukriya ${customerName}! Humne aapka ${amountFormatted} ka payment ${dateFormatted} ke liye schedule kar diya hai. Tab tak aapka cart locked rahega.`
    };
  }

  private runHeuristicAnalysis(
    transaction: Transaction,
    customer: Customer,
    history: CustomerHistory
  ): AiDecisionInput {
    const reason = (transaction.failureReason || '').toLowerCase();
    const amountInr = `₹${(transaction.amountMinor / 100).toLocaleString('en-IN')}`;

    if (transaction.checkoutStatus === 'ABANDONED') {
      return {
        diagnosis: 'Customer abandoned checkout flow prior to authorization',
        failureCategory: FailureCategory.ABANDONMENT,
        recommendedAction: RecoveryActionType.REMINDER,
        confidence: 0.88,
        rationale: 'Customer left checkout before completing payment. Sending a friendly reminder with direct checkout link.',
        customerMessage: `Hi ${customer.name}, your order #${transaction.orderId} is saved! Complete your checkout securely using your payment link.`,
        hinglishScript: `Namaste ${customer.name} ji! Acme Retail par aapka order #${transaction.orderId} hold par hai. Aap yahan click karke payment complete kar sakte hain.`
      };
    }

    if (reason.includes('network') || reason.includes('timeout') || reason.includes('gateway')) {
      return {
        diagnosis: 'Transient gateway or network communication timeout',
        failureCategory: FailureCategory.NETWORK_FAILURE,
        recommendedAction: RecoveryActionType.IMMEDIATE_RETRY,
        confidence: 0.92,
        rationale: 'Network timeout detected during authorization. Customer history shows high past success; immediate retry recommended.',
        hinglishScript: `Namaste ${customer.name} ji! Bank server timeout ki wajah se aapka ${amountInr} ka payment ruk gaya tha. Humne instant secure retry schedule kar diya hai.`
      };
    }

    if (reason.includes('insufficient') || reason.includes('funds') || reason.includes('balance')) {
      return {
        diagnosis: 'Insufficient balance or limit reached on customer account',
        failureCategory: FailureCategory.INSUFFICIENT_FUNDS,
        recommendedAction: RecoveryActionType.DELAYED_RETRY,
        confidence: 0.81,
        rationale: 'Insufficient funds reported. A delayed retry allows time for account replenishment or salary cycle credit.',
        hinglishScript: `Namaste ${customer.name} ji! Aapka ${amountInr} ka order pending hai. Agar aap chahein toh hum payment retry aapke salary date ya committed date par schedule kar sakte hain.`
      };
    }

    if (reason.includes('bank') || reason.includes('issuer') || reason.includes('decline')) {
      return {
        diagnosis: 'Bank/Issuer system failure or temporary decline',
        failureCategory: FailureCategory.BANK_FAILURE,
        recommendedAction: RecoveryActionType.DELAYED_RETRY,
        confidence: 0.76,
        rationale: 'Issuer decline experienced. Delayed retry recommended to avoid consecutive bank fraud flags.',
        hinglishScript: `Namaste ${customer.name} ji! Card issuing bank ke temporary network issue ki wajah se payment decline hua. Humne safe window retry queue me add kiya hai.`
      };
    }

    if (transaction.attemptCount >= 3 || history.previousFailures > 4) {
      return {
        diagnosis: 'Repeated transaction failures exceeding automated recovery safety profile',
        failureCategory: FailureCategory.UNKNOWN,
        recommendedAction: RecoveryActionType.ESCALATE,
        confidence: 0.85,
        rationale: 'Multiple retries failed without success. Escalating to merchant support team for manual intervention.',
        hinglishScript: `Namaste ${customer.name} ji! Humare support manager aapse directly connect karenge taaki aapka order smoothly complete ho sake.`
      };
    }

    return {
      diagnosis: 'Temporary card or payment channel authorization error',
      failureCategory: FailureCategory.TRANSIENT,
      recommendedAction: RecoveryActionType.IMMEDIATE_RETRY,
      confidence: 0.78,
      rationale: 'Transient authorization error on standard payment channel. Immediate single retry recommended.',
      hinglishScript: `Namaste ${customer.name} ji! Temporary authorization error aaya tha. Recura Autopilot safe auto-retry perform kar raha hai.`
    };
  }
}
