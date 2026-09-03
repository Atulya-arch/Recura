import { z } from 'zod';
import { PaymentStatus, RecoveryStatus, FailureCategory, RecoveryActionType } from './enums.js';

export const AiDecisionSchema = z.object({
  diagnosis: z.string().min(1),
  failureCategory: z.nativeEnum(FailureCategory),
  recommendedAction: z.nativeEnum(RecoveryActionType),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  customerMessage: z.string().optional()
});

export type AiDecisionInput = z.infer<typeof AiDecisionSchema>;

export const UpdatePolicySchema = z.object({
  maxRetries: z.number().int().min(0).max(10).optional(),
  maxRecoveryWindowHours: z.number().int().min(1).max(720).optional(),
  maxReminders: z.number().int().min(0).max(10).optional(),
  maxAutomatedActions: z.number().int().min(1).max(20).optional(),
  minimumAiConfidence: z.number().min(0).max(1).optional()
});

export const RunDemoScenarioSchema = z.object({
  scenario: z.enum(['SUCCESS', 'TIMEOUT', 'RETRY_LIMIT', 'DUPLICATE'])
});
