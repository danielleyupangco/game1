/**
 * The app mark: a cub's ear-and-cheek silhouette holding a small protea — the
 * national flower of South Africa, and the one nod to where this started.
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Nics and Dan's Cub"
    >
      <circle cx="24" cy="26" r="15" fill="var(--color-blush)" />
      <circle cx="11" cy="13" r="6" fill="var(--color-blush)" />
      <circle cx="37" cy="13" r="6" fill="var(--color-blush)" />

      {/* Protea: a ring of bracts around a soft centre. */}
      <g stroke="var(--color-blush-deep)" strokeWidth="1.4" strokeLinecap="round" fill="none">
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
          return (
            <line
              key={index}
              x1={24 + Math.cos(angle) * 4.5}
              y1={26 + Math.sin(angle) * 4.5}
              x2={24 + Math.cos(angle) * 8.5}
              y2={26 + Math.sin(angle) * 8.5}
            />
          );
        })}
      </g>
      <circle cx="24" cy="26" r="4" fill="var(--color-butter)" stroke="var(--color-blush-deep)" strokeWidth="1.4" />
    </svg>
  );
}
