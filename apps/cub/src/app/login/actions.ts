'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/validation';
import { publicEnv } from '@/lib/env';
import { z } from 'zod';

export interface AuthFormState {
  error?: string;
  sentTo?: string;
}

/**
 * Builds the absolute URL Supabase redirects back to. Derived from the request
 * host in development so magic links work on a phone testing over the LAN, and
 * pinned to the configured site URL in production so a spoofed Host header
 * cannot redirect the callback somewhere else.
 */
async function callbackUrl(next: string) {
  const base =
    process.env.NODE_ENV === 'production'
      ? publicEnv.NEXT_PUBLIC_SITE_URL
      : `http://${(await headers()).get('host') ?? 'localhost:3000'}`;

  const url = new URL('/auth/callback', base);
  url.searchParams.set('next', next);
  return url.toString();
}

/**
 * Only ever redirect to a path on this app, never to an absolute URL, so a
 * crafted ?next= cannot turn the sign-in flow into an open redirect.
 *
 * The cast is the boundary between a runtime-validated string and typedRoutes'
 * compile-time route union: `next` comes from a form field, so its value cannot
 * be known statically, and the check above is what makes it safe.
 */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === 'string' ? value : '/';
  const path = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return path as Parameters<typeof redirect>[0];
}

export async function sendMagicLink(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: await callbackUrl(safeNext(formData.get('next'))) },
  });

  if (error) return { error: error.message };

  return { sentTo: parsed.data };
}

const passwordSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Use at least 8 characters'),
});

export async function signInWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check your details' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Deliberately vague: a precise message would reveal which emails have
  // accounts on a private family app.
  if (error) return { error: 'That email and password did not match.' };

  redirect(safeNext(formData.get('next')));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
