import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { getSessionContext } from '@/lib/session';
import { AcceptInviteButton } from '@/app/invite/[token]/accept-button';

export const metadata: Metadata = { title: 'Join' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getSessionContext();

  // Not signed in yet: sign in first, then come straight back to this invite.
  if (!context) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  if (context.profile.household_id) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
        <Card className="text-center">
          <CardTitle>You&rsquo;re already in a household</CardTitle>
          <p className="mt-2 text-sm text-foreground-muted">
            You can only belong to one at a time.
          </p>
          <Link href="/" className={buttonClasses('primary', 'mt-4 w-full')}>
            Go to the app
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <h1 className="font-display text-2xl">You&rsquo;ve been invited</h1>
        <p className="text-sm text-foreground-muted">
          Joining gives you the same view of everything — the week, the logs, the memories.
        </p>
      </div>

      <AcceptInviteButton token={token} />
    </main>
  );
}
