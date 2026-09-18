import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { LoginForm } from '@/app/login/login-form';
import { getSessionContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // `next` is validated before it is ever written into a link; see safeNext in
  // ./actions.ts. The cast bridges that runtime check to typedRoutes.
  if (await getSessionContext()) {
    redirect((next?.startsWith('/') && !next.startsWith('//') ? next : '/') as '/');
  }

  const errorMessage =
    error === 'expired-link'
      ? 'That link has expired. Send yourself a fresh one.'
      : error === 'missing-code'
        ? 'That link was incomplete. Try again.'
        : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={64} />
        <h1 className="font-display text-3xl">Nics and Dan&rsquo;s Cub</h1>
        <p className="text-sm text-foreground-muted">
          A private place for the two of you. Sign in to pick up where you left off.
        </p>
      </div>

      <LoginForm next={next ?? '/'} initialError={errorMessage} />
    </main>
  );
}
