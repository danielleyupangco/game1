import { z } from 'zod';
import { isCivilDate } from '@/lib/civil-date';

const civilDate = z.string().refine(isCivilDate, 'Enter a valid date');

export const emailSchema = z.email('Enter a valid email address').trim().toLowerCase();

/**
 * Phone numbers are typed in by the user during onboarding and are never
 * invented by the app, so validation stays deliberately loose — any shape a
 * Philippine landline, mobile or hotline might take is accepted.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(32, 'That looks too long for a phone number')
  .regex(/^[0-9+()\-.\s]*$/, 'Use digits, spaces and + ( ) - only');

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you').max(60),
  role: z.enum(['mom', 'dad']),
  edd: civilDate,
  prepregWeightKg: z
    .number()
    .min(20, 'That seems too low')
    .max(300, 'That seems too high')
    .optional(),
  heightCm: z.number().min(100, 'That seems too short').max(250, 'That seems too tall').optional(),
  obPhone: phoneSchema.optional(),
  erPhone: phoneSchema.optional(),
  disclaimerAccepted: z.literal(true, {
    error: 'Please confirm you have read the note about medical advice',
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['mom', 'dad']).default('dad'),
});

export const eddSchema = z.object({ edd: civilDate });
