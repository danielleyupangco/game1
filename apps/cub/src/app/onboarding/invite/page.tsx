import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/session';
import { InviteForm } from '@/app/onboarding/invite/invite-form';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Invite Nico' };

export default async function InvitePartnerPage() {
  const context = await getSessionContext();
  if (!context) redirect('/login');
  if (!context.profile.household_id) redirect('/onboarding');

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">Invite Nico</h1>
        <p className="text-sm text-foreground-muted">
          He&rsquo;ll see everything you see, and can add to it. You can do this later from
          Settings.
        </p>
      </div>

      <InviteForm />

      <Link href="/" className={buttonClasses('ghost', 'w-full')}>
        Skip for now
      </Link>
    </main>
  );
}
