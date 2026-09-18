import type { SVGProps } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

type IconProps = SVGProps<SVGSVGElement>;

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function PlusCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 18 5-4.5 4 3.5 3-2.5 4 3.5" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * The red-flags affordance: a heart inside a shield. Deliberately gentle — a
 * warning triangle on every screen would read as alarm rather than reassurance.
 */
export function HeartShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-3.6 7-9V6l-7-3-7 3v6c0 5.4 7 9 7 9Z" />
      <path d="M12 15.5s-2.8-1.7-2.8-3.6a1.6 1.6 0 0 1 2.8-1 1.6 1.6 0 0 1 2.8 1c0 1.9-2.8 3.6-2.8 3.6Z" />
    </svg>
  );
}
