import { memo } from 'react';
import type { PatternKind } from '../theme/cardSkins';

interface CardPatternProps {
  kind: PatternKind;
  /** Unique per card — SVG pattern ids must not collide across the board. */
  uid: string;
  tint: string;
}

/**
 * The ornament tiled across a face-down card. One motif per era, drawn as an
 * SVG pattern so it scales with the card at any board size.
 */
function CardPattern({ kind, uid, tint }: CardPatternProps) {
  const id = `${kind}-${uid}`;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.26 }}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {kind === 'meander' && (
          // Greek key — Ancient
          <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
            <path
              d="M3 3h12v12H7V7h4"
              fill="none"
              stroke={tint}
              strokeWidth="1"
              strokeLinecap="square"
            />
          </pattern>
        )}

        {kind === 'lattice' && (
          // Heraldic diamond lattice — Medieval
          <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M8 0L16 8L8 16L0 8Z" fill="none" stroke={tint} strokeWidth="0.9" />
            <circle cx="8" cy="8" r="1.3" fill={tint} />
          </pattern>
        )}

        {kind === 'circuit' && (
          // Trace-and-via board — Modern
          <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M0 11h7m8 0h7M11 0v7m0 8v7" stroke={tint} strokeWidth="0.9" fill="none" />
            <circle cx="11" cy="11" r="2.4" fill="none" stroke={tint} strokeWidth="0.9" />
            <circle cx="11" cy="11" r="0.9" fill={tint} />
          </pattern>
        )}

        {kind === 'hexflux' && (
          // Hex mesh — Future
          <pattern id={id} width="20" height="17.4" patternUnits="userSpaceOnUse">
            <path
              d="M10 0L20 5.8v11.6L10 17.4L0 11.6V5.8Z"
              fill="none"
              stroke={tint}
              strokeWidth="0.85"
            />
            <circle cx="10" cy="8.7" r="1.6" fill={tint} fillOpacity="0.55" />
          </pattern>
        )}

        {kind === 'scale' && (
          // Dragon scale — Mythic
          <pattern id={id} width="16" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 12a8 8 0 0116 0" fill="none" stroke={tint} strokeWidth="1" />
            <path d="M-8 12a8 8 0 0116 0" fill="none" stroke={tint} strokeWidth="1" />
            <path d="M8 12a8 8 0 0116 0" fill="none" stroke={tint} strokeWidth="1" />
          </pattern>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default memo(CardPattern);
