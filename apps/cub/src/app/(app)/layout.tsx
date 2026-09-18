import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { requireOnboardedSession } from '@/lib/session';

/**
 * The signed-in shell. Every screen inside it has the header (and so the
 * one-tap red-flags link) and the bottom tab bar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /login or /onboarding as needed, so no child has to guard.
  await requireOnboardedSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      {/* pb-20 clears the fixed tab bar. */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
