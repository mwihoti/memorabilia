/**
 * Development logging.
 *
 * Silent in production builds — devtools on the live site should show the
 * player's errors, not our boot narration. Genuine failures still go through
 * `logError`, which always reports.
 */

const enabled = import.meta.env.DEV;

export function debug(...args: unknown[]): void {
  if (enabled) console.log(...args);
}

export function warn(...args: unknown[]): void {
  if (enabled) console.warn(...args);
}

/** Always reports — real failures must stay visible in production. */
export function logError(...args: unknown[]): void {
  console.error(...args);
}
