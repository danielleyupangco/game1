'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { inviteSchema, onboardingSchema } from '@/lib/validation';
import { impliedConceptionDate } from '@/lib/pregnancy';

export interface OnboardingState {
  error?: string;
}

/** Reads a numeric form field, treating blank as "not answered". */
function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function completeOnboarding(
  _previous: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get('displayName'),
    role: formData.get('role'),
    edd: formData.get('edd'),
    prepregWeightKg: optionalNumber(formData.get('prepregWeightKg')),
    heightCm: optionalNumber(formData.get('heightCm')),
    obPhone: formData.get('obPhone') ?? undefined,
    erPhone: formData.get('erPhone') ?? undefined,
    disclaimerAccepted: formData.get('disclaimerAccepted') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form' };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: householdId, error: householdError } = await supabase.rpc(
    'create_household_and_join',
    {
      household_name: `${input.displayName}'s household`,
      member_role: input.role,
      member_display_name: input.displayName,
    },
  );

  if (householdError || !householdId) {
    return { error: householdError?.message ?? 'Could not set up your household' };
  }

  // Upsert rather than insert so a half-finished onboarding can be resumed
  // without tripping the one-pregnancy-per-household constraint.
  const { error: pregnancyError } = await supabase.from('pregnancy').upsert(
    {
      household_id: householdId,
      edd: input.edd,
      conception_date: impliedConceptionDate(input.edd),
      ob_name: 'Dra. Fe Villafria',
      hospital: 'Makati Medical Center',
      // Phone numbers are whatever the user typed, or null. The app never
      // supplies a number it was not given.
      ob_phone: input.obPhone?.trim() || null,
      er_phone: input.erPhone?.trim() || null,
      prepreg_weight_kg: input.prepregWeightKg ?? null,
      height_cm: input.heightCm ?? null,
    },
    { onConflict: 'household_id' },
  );

  if (pregnancyError) return { error: pregnancyError.message };

  revalidatePath('/', 'layout');
  redirect('/onboarding/invite');
}

export interface InviteState {
  error?: string;
  invitedEmail?: string;
  inviteUrl?: string;
}

export async function invitePartner(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role') ?? 'dad',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address' };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.household_id) return { error: 'Finish setting up your household first' };

  const { data: invite, error } = await supabase
    .from('household_invites')
    .upsert(
      {
        household_id: profile.household_id,
        email: parsed.data.email,
        role: parsed.data.role,
        invited_by: user.id,
        // Re-inviting reissues: the old token stops working and the clock
        // restarts, so a link forwarded months ago cannot still be redeemed.
        token: crypto.randomUUID(),
        accepted_at: null,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'household_id,email' },
    )
    .select('token')
    .single();

  if (error || !invite) return { error: error?.message ?? 'Could not create the invite' };

  return {
    invitedEmail: parsed.data.email,
    // Shown so it can be sent by hand. Supabase's own invite email is optional
    // and this keeps the flow working before SMTP is configured.
    inviteUrl: `/invite/${invite.token}`,
  };
}
