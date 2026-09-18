import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { HeartShieldIcon } from '@/components/icons';

/**
 * Sits on every signed-in screen. The red-flags link is the reason it is a
 * shared header rather than per-page chrome: the requirement is that help is
 * one tap away from anywhere in the app, with no scrolling and no menu.
 */
export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-display text-base font-semibold">
            {title ?? "Nics and Dan's Cub"}
          </span>
        </Link>

        <Link
          href="/red-flags"
          aria-label="Warning signs and emergency numbers"
          className="ml-auto flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground"
        >
          <HeartShieldIcon className="size-6" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
