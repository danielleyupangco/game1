'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function accept() {
    setError(null);
    const supabase = createClient();

    // The token alone is not enough: the function also checks the invite was
    // addressed to this account's email.
    const { error: rpcError } = await supabase.rpc('join_household_with_token', {
      invite_token: token,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    startTransition(() => {
      router.replace('/');
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <Button type="button" onClick={accept} disabled={pending}>
        {pending ? 'Joining…' : 'Join the household'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[#8c2f2f]">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
