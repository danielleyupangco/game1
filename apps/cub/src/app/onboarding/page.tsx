import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/session';
import { OnboardingForm } from '@/app/onboarding/onboarding-form';

export const metadata: Metadata = { title: 'Set up' };

export default async function OnboardingPage() {
  const context = await getSessionContext();
  if (!context) redirect('/login');

  // Already set up — nothing to do here.
  if (context.profile.household_id && context.pregnancy) redirect('/');

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">Let&rsquo;s get you set up</h1>
        <p className="text-sm text-foreground-muted">
          A few details so the app can work out where you are. You can change any of this later.
        </p>
      </div>

      <OnboardingForm defaultName={context.profile.display_name ?? ''} />
    </main>
  );
}
