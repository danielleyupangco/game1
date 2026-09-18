/**
 * A line-art bump that rises and falls like a slow breath. The animation is
 * defined in globals.css so the reduced-motion rule there switches it off.
 */
export function BumpIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      role="img"
      aria-label="Illustration of a pregnant figure resting a hand on their bump"
    >
      <g className="animate-breathe">
        <circle cx="60" cy="62" r="34" fill="var(--color-blush)" opacity="0.55" />
        <circle cx="60" cy="62" r="24" fill="var(--color-butter)" opacity="0.45" />
      </g>
      <g
        stroke="var(--color-blush-deep)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M44 22c0-6 5-10 11-10s11 4 11 10-5 10-11 10-11-4-11-10Z" />
        <path d="M52 32c-8 3-13 10-14 19-1 8-2 14-6 20" />
        <path d="M60 32c10 2 16 10 19 21 3 12-1 24-9 31" />
        <path className="animate-breathe" d="M70 84c-8 5-18 5-26 0" />
      </g>
    </svg>
  );
}
