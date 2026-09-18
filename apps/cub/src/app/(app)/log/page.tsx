import type { Metadata } from 'next';
import { Card, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Log' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Your logs</h1>
      <Card>
        <CardTitle>Not built yet</CardTitle>
        <p className="mt-2 text-sm text-foreground-muted">
          This tab arrives in a later milestone. The navigation is here now so the shell can be
          tested end to end.
        </p>
      </Card>
    </div>
  );
}
