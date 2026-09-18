import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { PregnancyRow, ProfileRow } from '@/lib/database.types';

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: ProfileRow;
  pregnancy: PregnancyRow | null;
}

/**
 * Loads the signed-in user together with their profile and pregnancy.
 *
 * Returns null rather than redirecting so callers can decide: the app shell
 * sends you to /login, while the invite screen wants to render either way.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  // Before onboarding there is no household, so there is nothing to look up.
  const pregnancy = profile.household_id
    ? (
        await supabase
          .from('pregnancy')
          .select('*')
          .eq('household_id', profile.household_id)
          .maybeSingle()
      ).data
    : null;

  return { userId: user.id, email: user.email ?? null, profile, pregnancy };
}

/**
 * The guard for every screen inside the app shell: signed in, in a household,
 * and past onboarding. Anything missing routes to the step that supplies it.
 */
export async function requireOnboardedSession(): Promise<
  SessionContext & { pregnancy: PregnancyRow; profile: ProfileRow & { household_id: string } }
> {
  const context = await getSessionContext();

  if (!context) redirect('/login');
  if (!context.profile.household_id || !context.pregnancy) redirect('/onboarding');

  return context as SessionContext & {
    pregnancy: PregnancyRow;
    profile: ProfileRow & { household_id: string };
  };
}
