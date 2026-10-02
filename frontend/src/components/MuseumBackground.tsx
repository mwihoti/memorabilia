import { useEffect, useRef } from 'react';
import { getCardSkin } from '../theme/cardSkins';
import type { Difficulty } from '../types';

interface MuseumBackgroundProps {
  /** Tints the ambience to the era being played. Null = gold lobby default. */
  era?: Difficulty | null;
  level?: number;
}

/** Contour band drifting across the gallery wall. */
interface Contour {
  y: number;
  amp: number;
  len: number;
  phase: number;
  speed: number;
  width: number;
  alpha: number;
}

/** A card drifting through the gallery, far behind everything else. */
interface FloatCard {
  x: number;
  y: number;
  w: number;
  /** Radians. */
  angle: number;
  spin: number;
  vy: number;
  drift: number;
  /** Phase offset so the sway and the spin are not in lockstep. */
  phase: number;
  alpha: number;
}

/** Dust mote caught in a light shaft. */
interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  twinkle: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * The animated gallery behind every screen.
 *
 * Four layers on one canvas: a pair of breathing light shafts, slow topographic
 * contours suggesting marble veining, ghost cards drifting upward, and dust
 * motes rising through the light. Tinted by the active era so the room changes
 * as the player travels through time.
 *
 * Costs: one rAF loop, capped at 30fps, paused when the tab is hidden, and
 * reduced to a single static paint when the viewer asks for less motion.
 */
export default function MuseumBackground({ era = null, level = 1 }: MuseumBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skin = getCardSkin(era, level);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = prefersReducedMotion();

    // Cap the backing store on phones — a retina full-screen canvas at dpr 3
    // is pure heat for a background nobody looks at directly.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    let contours: Contour[] = [];
    let motes: Mote[] = [];
    let cards: FloatCard[] = [];

    const seed = (era ?? 0) * 97 + 13;
    const rand = mulberry32(seed);

    function build() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fewer, fatter contours on narrow screens.
      const bands = w < 640 ? 7 : 12;
      contours = Array.from({ length: bands }, (_, i) => ({
        y: (h / (bands - 1)) * i,
        amp: 18 + rand() * 46,
        len: 0.0022 + rand() * 0.0034,
        phase: rand() * Math.PI * 2,
        speed: 0.00022 + rand() * 0.00046,
        width: 0.6 + rand() * 1.1,
        alpha: 0.05 + rand() * 0.09,
      }));

      // Few and large: these read as depth, not as content. More than a handful
      // and the eye starts trying to match them, which fights the real board.
      const cardCount = w < 640 ? 4 : 7;
      cards = Array.from({ length: cardCount }, () => {
        const width = 46 + rand() * 54;
        return {
          x: rand() * w,
          y: rand() * h,
          w: width,
          angle: (rand() - 0.5) * 0.8,
          spin: (rand() - 0.5) * 0.00022,
          vy: -(0.045 + rand() * 0.075),
          drift: (rand() - 0.5) * 0.05,
          phase: rand() * Math.PI * 2,
          alpha: 0.05 + rand() * 0.07,
        };
      });

      const moteCount = w < 640 ? 18 : 42;
      motes = Array.from({ length: moteCount }, () => ({
        x: rand() * w,
        y: rand() * h,
        r: 0.5 + rand() * 1.7,
        vx: (rand() - 0.5) * 0.09,
        vy: -(0.05 + rand() * 0.16),
        alpha: 0.12 + rand() * 0.42,
        twinkle: rand() * Math.PI * 2,
      }));
    }

    function paint(t: number) {
      ctx!.clearRect(0, 0, w, h);

      // ── Light shafts — two soft wedges from the upper corners ────────────
      const breathe = reduced ? 0.5 : 0.5 + Math.sin(t * 0.00032) * 0.22;
      drawShaft(ctx!, w * 0.22, h, w * 0.3, skin.accent, 0.05 * breathe);
      drawShaft(ctx!, w * 0.78, h, w * 0.26, skin.accent, 0.035 * (1 - breathe * 0.4));

      // ── Contours — marble veining that drifts sideways ───────────────────
      ctx!.lineCap = 'round';
      for (const c of contours) {
        ctx!.beginPath();
        ctx!.strokeStyle = withAlpha(skin.accent, c.alpha);
        ctx!.lineWidth = c.width;
        const drift = reduced ? 0 : t * c.speed;
        const step = w < 640 ? 14 : 9;
        for (let x = 0; x <= w + step; x += step) {
          const y =
            c.y +
            Math.sin(x * c.len + c.phase + drift) * c.amp +
            Math.sin(x * c.len * 2.7 + c.phase * 1.6 + drift * 1.4) * (c.amp * 0.3);
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      }

      // ── Cards — drifting upward behind the dust ──────────────────────────
      for (const c of cards) {
        if (!reduced) {
          c.y += c.vy;
          c.x += c.drift + Math.sin(t * 0.00018 + c.phase) * 0.22;
          c.angle += c.spin;
          if (c.y < -c.w * 1.8) {
            c.y = h + c.w * 1.8;
            c.x = Math.random() * w;
          }
          if (c.x < -c.w * 2) c.x = w + c.w * 2;
          if (c.x > w + c.w * 2) c.x = -c.w * 2;
        }
        drawCard(ctx!, c, skin.accent, reduced ? c.alpha : c.alpha * (0.75 + Math.sin(t * 0.0004 + c.phase) * 0.25));
      }

      // ── Motes — dust rising through the shafts ───────────────────────────
      for (const m of motes) {
        if (!reduced) {
          m.x += m.vx;
          m.y += m.vy;
          m.twinkle += 0.018;
          if (m.y < -8) {
            m.y = h + 8;
            m.x = Math.random() * w;
          }
          if (m.x < -8) m.x = w + 8;
          if (m.x > w + 8) m.x = -8;
        }
        const a = m.alpha * (reduced ? 1 : 0.62 + Math.sin(m.twinkle) * 0.38);
        ctx!.beginPath();
        ctx!.fillStyle = withAlpha(skin.accent, a);
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    let raf = 0;
    let last = 0;
    let running = true;

    function frame(now: number) {
      if (!running) return;
      // 30fps is plenty for drifting contours and halves the battery cost.
      if (now - last >= 33) {
        paint(now);
        last = now;
      }
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      build();
      paint(performance.now());
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    build();
    paint(performance.now());

    if (!reduced) raf = requestAnimationFrame(frame);

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [skin.accent, era]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Deep gallery ground — a static wash under the canvas */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(120% 80% at 50% -10%, ${withAlpha(skin.accent, 0.07)} 0%, transparent 55%),
            radial-gradient(90% 60% at 12% 100%, rgba(232,180,74,0.05) 0%, transparent 60%),
            linear-gradient(180deg, var(--mu-void) 0%, var(--mu-bg) 42%, var(--mu-bg-2) 100%)
          `,
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/**
 * One drifting card: a rounded rectangle at the game's 1:1.4 ratio, outlined
 * rather than filled so it reads as a ghost behind the content.
 */
function drawCard(
  ctx: CanvasRenderingContext2D,
  card: FloatCard,
  color: string,
  alpha: number,
) {
  const w = card.w;
  const h = w * 1.4;
  const r = w * 0.12;

  ctx.save();
  ctx.translate(card.x, card.y);
  ctx.rotate(card.angle);
  roundedRect(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fillStyle = withAlpha(color, alpha * 0.35);
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.lineWidth = 1;
  ctx.stroke();

  // The inlaid frame the real cards carry, so these read as the same object.
  roundedRect(ctx, -w / 2 + w * 0.1, -h / 2 + w * 0.1, w * 0.8, h - w * 0.2, r * 0.6);
  ctx.strokeStyle = withAlpha(color, alpha * 0.55);
  ctx.stroke();
  ctx.restore();
}

/**
 * Rounded rectangle path.
 *
 * `ctx.roundRect` is Chrome 99+; Telegram's Android WebView on older handsets
 * predates it, and an exception thrown inside the animation loop would take the
 * entire background down. Fall back to arcs there.
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();

  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }

  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A soft triangular wedge of light rising from the floor. */
function drawShaft(
  ctx: CanvasRenderingContext2D,
  cx: number,
  h: number,
  width: number,
  color: string,
  alpha: number,
) {
  const g = ctx.createLinearGradient(cx, 0, cx, h);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - width * 0.16, 0);
  ctx.lineTo(cx + width * 0.16, 0);
  ctx.lineTo(cx + width, h);
  ctx.lineTo(cx - width, h);
  ctx.closePath();
  ctx.fill();
}

/** `#rrggbb` + alpha → `rgba(...)`. */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha.toFixed(3)})`;
}

/** Small deterministic PRNG so an era's ambience looks the same every visit. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
