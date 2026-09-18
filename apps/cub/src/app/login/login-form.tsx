'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { sendMagicLink, signInWithPassword, type AuthFormState } from '@/app/login/actions';

type Mode = 'magic-link' | 'password';

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [mode, setMode] = useState<Mode>('magic-link');
  const action = mode === 'magic-link' ? sendMagicLink : signInWithPassword;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});

  const error = state.error ?? initialError;

  if (state.sentTo) {
    return (
      <Card className="text-center">
        <h2 className="font-display text-xl">Check your email</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          We sent a sign-in link to <strong className="text-foreground">{state.sentTo}</strong>.
          Open it on this phone and you&rsquo;ll be straight in.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      {/* The two modes post to different actions, so remounting the form on a
          mode switch keeps pending state from leaking between them. */}
      <form key={mode} action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
        />

        {mode === 'password' ? (
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-[#8c2f2f]">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending
            ? 'One moment…'
            : mode === 'magic-link'
              ? 'Email me a sign-in link'
              : 'Sign in'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setMode(mode === 'magic-link' ? 'password' : 'magic-link')}
        >
          {mode === 'magic-link' ? 'Use a password instead' : 'Email me a link instead'}
        </Button>
      </form>
    </Card>
  );
}
