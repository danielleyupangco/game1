import { cn } from '@/lib/utils';

interface ProgressRingProps {
  /** 0–1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  /** Describes the value for screen readers, e.g. "Week 4 of 40". */
  label: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 160,
  strokeWidth = 10,
  className,
  trackClassName,
  label,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={label}
        // Rotated so the arc starts at 12 o'clock rather than 3 o'clock.
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={cn('stroke-border', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className={cn('stroke-[var(--color-blush-deep)] transition-[stroke-dashoffset] duration-700', className)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
