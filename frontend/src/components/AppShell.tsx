import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { hapticImpact } from '../telegram/telegram';

export type NavKey = 'museum' | 'activities' | 'collection' | 'dashboard';

export interface NavItem {
  key: NavKey;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'museum', label: 'Enter Museum', icon: '🏛️' },
  { key: 'activities', label: 'Activities', icon: '⚔️' },
  { key: 'collection', label: 'Collection', icon: '🏺' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
];

interface AppShellProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  /** Rendered in the top bar on wide screens — the era chip during a game. */
  topSlot?: ReactNode;
  children: ReactNode;
}

/**
 * The gallery chrome: an icon rail on desktop, a bottom dock on phones, and a
 * top bar carrying the museum mark and the player badge on both.
 */
export default function AppShell({ active, onNavigate, topSlot, children }: AppShellProps) {
  const { playerName, telegramUser } = useGameStore();

  const displayName = playerName || telegramUser?.first_name || 'Curator';
  const handle = telegramUser?.username ? `@${telegramUser.username}` : null;
  const initial = displayName[0]?.toUpperCase() ?? 'C';

  const go = (key: NavKey) => {
    hapticImpact('light');
    onNavigate(key);
  };

  return (
    <div className="relative z-10 min-h-dvh">
      {/* ── Desktop rail ──────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-dvh flex-col items-center border-r lg:flex"
        style={{
          width: 'var(--mu-rail-lg)',
          borderColor: 'var(--mu-line-soft)',
          background: 'linear-gradient(180deg, rgba(14,21,38,0.94) 0%, rgba(6,10,20,0.94) 100%)',
          backdropFilter: 'blur(14px)',
          paddingTop: 'calc(1.5rem + var(--safe-top))',
          paddingBottom: 'calc(1.25rem + var(--safe-bottom))',
        }}
      >
        <div className="flex flex-col items-center px-4 text-center">
          <div className="text-4xl" style={{ filter: 'drop-shadow(0 4px 16px rgba(232,180,74,0.5))' }}>
            🏛️
          </div>
          <div className="mu-eyebrow mt-3 leading-tight">Time-Travel Museum</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--mu-faint)' }}>
            Memorabilia
          </div>
        </div>

        <hr className="mu-rule my-5 w-3/4" />

        <nav className="flex w-full flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <RailButton
              key={item.key}
              item={item}
              active={active === item.key}
              onClick={() => go(item.key)}
            />
          ))}
        </nav>

        <div className="mt-auto w-full px-3">
          <hr className="mu-rule mb-4" />
          <div className="flex items-center gap-2.5 px-2">
            <Avatar initial={initial} size={38} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" style={{ color: 'var(--mu-text)' }}>
                {displayName}
              </div>
              {handle && (
                <div className="truncate text-xs" style={{ color: 'var(--mu-faint)' }}>
                  {handle}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header
        className="fixed left-0 right-0 top-0 z-20 flex items-center gap-3 border-b px-3 sm:px-5 lg:pl-[calc(var(--mu-rail-lg)+1.25rem)]"
        style={{
          height: 'calc(var(--mu-topbar) + var(--safe-top))',
          paddingTop: 'var(--safe-top)',
          borderColor: 'var(--mu-line-soft)',
          background: 'rgba(8,13,26,0.82)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {/* Mark — hidden on desktop where the rail carries it */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="text-xl">🏛️</span>
          <div className="leading-tight">
            <div className="text-[13px] font-bold" style={{ color: 'var(--mu-gold)' }}>
              Time-Travel Museum
            </div>
            <div className="text-[10px]" style={{ color: 'var(--mu-faint)' }}>
              Memorabilia · Starknet
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center lg:flex">{topSlot}</div>
        <div className="flex-1 lg:hidden" />

        {/* Desktop nav pills */}
        <nav className="hidden items-center gap-1.5 md:flex lg:hidden xl:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                active === item.key ? 'mu-btn-gold' : 'mu-btn-ghost'
              }`}
            >
              <span className="mr-1.5">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => go('dashboard')}
          className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-white/5"
        >
          <Avatar initial={initial} size={32} />
          <span
            className="hidden max-w-[7rem] truncate text-sm font-semibold sm:inline"
            style={{ color: 'var(--mu-text)' }}
          >
            {displayName}
          </span>
        </button>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main
        className="lg:pl-[var(--mu-rail-lg)]"
        style={{
          paddingTop: 'calc(var(--mu-topbar) + var(--safe-top))',
          paddingBottom: 'calc(var(--mu-dock) + var(--safe-bottom) + 0.5rem)',
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">{children}</div>
      </main>

      {/* ── Mobile dock ───────────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t lg:hidden"
        style={{
          height: 'calc(var(--mu-dock) + var(--safe-bottom))',
          paddingBottom: 'var(--safe-bottom)',
          borderColor: 'var(--mu-line-soft)',
          background: 'rgba(8,13,26,0.94)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="mu-dock-active"
                  className="absolute inset-x-3 top-0 h-[2px] rounded-full"
                  style={{ background: 'var(--mu-gold)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className={`text-lg transition-transform ${isActive ? 'scale-110' : 'opacity-60'}`}>
                {item.icon}
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--mu-gold)' : 'var(--mu-faint)' }}
              >
                {item.label.replace('Enter ', '')}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function RailButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
      style={{
        background: active ? 'rgba(232,180,74,0.13)' : 'transparent',
        color: active ? 'var(--mu-gold-bright)' : 'var(--mu-muted)',
      }}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="mu-rail-active"
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-r"
          style={{ background: 'var(--mu-gold)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className="text-lg">{item.icon}</span>
      <span className="text-sm font-semibold">{item.label}</span>
    </button>
  );
}

function Avatar({ initial, size }: { initial: string; size: number }) {
  return (
    <span
      className="font-display grid shrink-0 place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.46,
        color: '#2a1e06',
        background: 'linear-gradient(160deg, var(--mu-gold-bright), var(--mu-gold-deep))',
        boxShadow: '0 0 0 1px rgba(232,180,74,0.4), 0 4px 14px -6px rgba(232,180,74,0.8)',
      }}
    >
      {initial}
    </span>
  );
}
