'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { invitePartner, type InviteState } from '@/app/onboarding/actions';

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(invitePartner, {});

  if (state.invitedEmail && state.inviteUrl) {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Invite ready</h2>
        <p className="text-sm text-foreground-muted">
          Send this link to <strong className="text-foreground">{state.invitedEmail}</strong>. It
          only works for that email address, and it expires in 14 days.
        </p>
        <code className="break-all rounded-2xl bg-surface-muted p-3 text-xs">
          {state.inviteUrl}
        </code>
        <Link href="/" className={buttonClasses('primary', 'w-full')}>
          Done
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="role" value="dad" />

        <Field
          label="Nico's email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="nico@example.com"
        />

        {state.error ? (
          <p role="alert" className="text-sm font-medium text-[#8c2f2f]">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Creating invite…' : 'Create invite link'}
        </Button>
      </form>
    </Card>
  );
}
