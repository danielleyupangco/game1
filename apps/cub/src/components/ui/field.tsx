import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

interface FieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function Field({ label, hint, error, className, ...props }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={cn(hint && hintId, error && errorId) || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-11 rounded-2xl border border-border bg-surface px-4 text-base text-foreground',
          'placeholder:text-foreground-muted',
          error && 'border-[#8c2f2f]',
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-foreground-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[#8c2f2f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
