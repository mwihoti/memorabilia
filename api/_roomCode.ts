import { randomInt } from 'node:crypto';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * A six-character room or duel code.
 *
 * Always six: the base-36 slice of Math.random() this replaces came out short
 * whenever the float had few digits, which made the invite unparseable.
 * Ambiguous glyphs (0/O, 1/I) are left out because people read codes aloud.
 */
export function newRoomCode(): string {
  let id = '';
  for (let i = 0; i < 6; i++) id += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
  return id;
}

/** A board seed dealt by the server, so no player picks the layout. */
export function newBoardSeed(): number {
  return randomInt(2_000_000_000);
}
