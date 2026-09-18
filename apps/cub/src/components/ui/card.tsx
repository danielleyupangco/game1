import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(74,74,74,0.05),0_8px_24px_-12px_rgba(74,74,74,0.12)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('text-lg text-foreground', className)} {...props} />;
}

export function CardLabel({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted',
        className,
      )}
      {...props}
    />
  );
}
