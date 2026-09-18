import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--color-blush-deep)] text-white hover:opacity-90',
  secondary: 'bg-accent text-accent-foreground hover:opacity-90',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  danger: 'bg-[#8c2f2f] text-white hover:opacity-90',
};

/**
 * Shared button styling, exported so a `Link` can look like a button without
 * nesting an anchor inside a `<button>`.
 */
export function buttonClasses(variant: Variant = 'primary', className?: string) {
  return cn(
    // min-h-11 is 44px — the minimum comfortable tap target on iOS.
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold',
    'transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
