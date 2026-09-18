import type { Metadata } from 'next';
import { Card, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = { title: 'Offline' };

/** Served by the service worker when a navigation fails with no connection. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo size={56} />
        <CardTitle className="font-display text-2xl">You&rsquo;re offline</CardTitle>
      </div>
      <Card>
        <p className="text-sm text-foreground-muted">
          The guide pages you&rsquo;ve already opened still work without a connection. Anything you
          log will sync once you&rsquo;re back online.
        </p>
      </Card>
    </main>
  );
}
