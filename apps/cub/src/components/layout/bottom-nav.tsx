'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarIcon, HomeIcon, ImageIcon, MoreIcon, PlusCircleIcon } from '@/components/icons';

const TABS = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/week', label: 'Week', Icon: CalendarIcon },
  { href: '/log', label: 'Log', Icon: PlusCircleIcon },
  { href: '/memories', label: 'Memories', Icon: ImageIcon },
  { href: '/more', label: 'More', Icon: MoreIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ href, label, Icon }) => {
          // '/' would otherwise prefix-match every route.
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                  isActive ? 'text-accent-foreground' : 'text-foreground-muted',
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
