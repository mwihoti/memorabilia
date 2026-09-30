/**
 * Card skins, one per era.
 *
 * The board's look changes as the player travels through time: Ancient clay and
 * ochre, Medieval iron and heraldry, Modern steel and neon, Future plasma,
 * Mythic obsidian and dragonfire. `getCardSkin(era, level)` is the only entry
 * point — it also layers a per-level accent so deep levels within one era read
 * as a progression rather than 50 identical boards.
 */

import { Difficulty } from '../types';

export interface CardSkin {
  /** Stable key — used for React remount and CSS pattern ids. */
  id: string;
  /** Human label shown on the board chip. */
  label: string;
  /** Glyph stamped on the face-down card. */
  glyph: string;
  /** Face-down gradient stops. */
  backFrom: string;
  backVia: string;
  backTo: string;
  /** Face-down border and its hover state. */
  border: string;
  borderHover: string;
  /** Face-up (unmatched) surface. */
  frontFrom: string;
  frontTo: string;
  frontBorder: string;
  /** Face-up matched surface. */
  matchedFrom: string;
  matchedVia: string;
  matchedTo: string;
  matchedBorder: string;
  /** Radial burst colour played on a match. */
  burst: string;
  /** Glow used for hint highlighting and matched shadow. */
  glow: string;
  /** Accent used for the era chip and board furniture. */
  accent: string;
  /** Which ornament to draw inside the face-down card. */
  pattern: PatternKind;
}

export type PatternKind = 'meander' | 'lattice' | 'circuit' | 'hexflux' | 'scale';

const SKINS: Record<Difficulty, CardSkin> = {
  // ── Ancient Era — sun-baked clay, ochre, Greek meander ────────────────────
  1: {
    id: 'ancient',
    label: 'Ancient Era',
    glyph: '🏺',
    backFrom: '#3b2a17',
    backVia: '#2a1d10',
    backTo: '#1a1209',
    border: 'rgba(214, 158, 74, 0.42)',
    borderHover: 'rgba(240, 195, 110, 0.85)',
    frontFrom: '#f4e7ce',
    frontTo: '#e2cda4',
    frontBorder: 'rgba(160, 120, 60, 0.5)',
    matchedFrom: '#f0cd8a',
    matchedVia: '#d6a048',
    matchedTo: '#b8862c',
    matchedBorder: 'rgba(245, 205, 109, 0.9)',
    burst: 'rgba(232, 180, 74, 0.6)',
    glow: 'rgba(232, 180, 74, 0.85)',
    accent: '#e8b44a',
    pattern: 'meander',
  },

  // ── Medieval Times — cold iron, deep indigo, heraldic lattice ─────────────
  2: {
    id: 'medieval',
    label: 'Medieval Times',
    glyph: '⚔️',
    backFrom: '#1c2340',
    backVia: '#141a30',
    backTo: '#0d1122',
    border: 'rgba(148, 163, 214, 0.36)',
    borderHover: 'rgba(191, 205, 255, 0.8)',
    frontFrom: '#e8ecf8',
    frontTo: '#ccd4ea',
    frontBorder: 'rgba(110, 125, 175, 0.5)',
    matchedFrom: '#9fb0e8',
    matchedVia: '#7e91d6',
    matchedTo: '#5a6cb4',
    matchedBorder: 'rgba(191, 205, 255, 0.9)',
    burst: 'rgba(148, 163, 234, 0.6)',
    glow: 'rgba(160, 176, 232, 0.85)',
    accent: '#9fb0e8',
    pattern: 'lattice',
  },

  // ── Modern Era — brushed steel, cyan circuitry ────────────────────────────
  3: {
    id: 'modern',
    label: 'Modern Era',
    glyph: '🚀',
    backFrom: '#10283a',
    backVia: '#0b1c2b',
    backTo: '#07131e',
    border: 'rgba(56, 189, 248, 0.34)',
    borderHover: 'rgba(125, 211, 252, 0.85)',
    frontFrom: '#e2f4fd',
    frontTo: '#bfe4f7',
    frontBorder: 'rgba(56, 140, 190, 0.5)',
    matchedFrom: '#7dd3fc',
    matchedVia: '#38bdf8',
    matchedTo: '#0284c7',
    matchedBorder: 'rgba(125, 211, 252, 0.9)',
    burst: 'rgba(56, 189, 248, 0.6)',
    glow: 'rgba(56, 189, 248, 0.85)',
    accent: '#38bdf8',
    pattern: 'circuit',
  },

  // ── Future Nexus — violet plasma, hex flux ────────────────────────────────
  4: {
    id: 'future',
    label: 'Future Nexus',
    glyph: '🛸',
    backFrom: '#241442',
    backVia: '#190d2f',
    backTo: '#0f0820',
    border: 'rgba(192, 132, 252, 0.36)',
    borderHover: 'rgba(216, 180, 254, 0.85)',
    frontFrom: '#f1e6ff',
    frontTo: '#dcc6fb',
    frontBorder: 'rgba(147, 97, 205, 0.5)',
    matchedFrom: '#d8b4fe',
    matchedVia: '#c084fc',
    matchedTo: '#9333ea',
    matchedBorder: 'rgba(216, 180, 254, 0.9)',
    burst: 'rgba(192, 132, 252, 0.6)',
    glow: 'rgba(192, 132, 252, 0.85)',
    accent: '#c084fc',
    pattern: 'hexflux',
  },

  // ── Mythic Vault — obsidian and dragonfire, reptilian scale ───────────────
  5: {
    id: 'mythic',
    label: 'Mythic Vault',
    glyph: '🐲',
    backFrom: '#3a1018',
    backVia: '#280a11',
    backTo: '#17050a',
    border: 'rgba(248, 113, 113, 0.36)',
    borderHover: 'rgba(252, 165, 165, 0.85)',
    frontFrom: '#ffeaea',
    frontTo: '#f9cdcd',
    frontBorder: 'rgba(180, 70, 70, 0.5)',
    matchedFrom: '#fca5a5',
    matchedVia: '#f87171',
    matchedTo: '#b91c1c',
    matchedBorder: 'rgba(252, 165, 165, 0.9)',
    burst: 'rgba(248, 113, 113, 0.6)',
    glow: 'rgba(248, 113, 113, 0.85)',
    accent: '#f87171',
    pattern: 'scale',
  },
};

/** Fallback used when no era is active — the lobby and challenge rooms. */
export const DEFAULT_SKIN: CardSkin = SKINS[1];

/**
 * Resolve the skin for a board.
 *
 * Within an era the hue holds steady but the card back darkens every 10 levels,
 * so level 41 visibly outranks level 1 without becoming a different era.
 */
export function getCardSkin(era: Difficulty | null, level = 1): CardSkin {
  const base = era !== null && SKINS[era] ? SKINS[era] : DEFAULT_SKIN;
  const tier = Math.min(4, Math.floor(Math.max(0, level - 1) / 10));
  if (tier === 0) return base;

  return {
    ...base,
    id: `${base.id}-t${tier}`,
    backFrom: darken(base.backFrom, tier * 0.06),
    backVia: darken(base.backVia, tier * 0.06),
    backTo: darken(base.backTo, tier * 0.05),
    border: base.borderHover.replace(/[\d.]+\)$/, `${0.34 + tier * 0.1})`),
  };
}

/** Skin for an era at a glance — era cards, dashboards, level strips. */
export function getEraSkin(era: Difficulty): CardSkin {
  return SKINS[era] ?? DEFAULT_SKIN;
}

/** Darken a #rrggbb hex by `amount` (0–1). */
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = Math.max(0, 1 - amount);
  const r = Math.round(((n >> 16) & 0xff) * f);
  const g = Math.round(((n >> 8) & 0xff) * f);
  const b = Math.round((n & 0xff) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
