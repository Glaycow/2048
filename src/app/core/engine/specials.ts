import { Tile } from './types';

export const SPECIALS_FROM_MOVE = 4;
export const BOMB_FUSE = 5;
export const ICE_TURNS = 3;
export const MAX_STONES = 2;

export const isNumber = (tile: Tile): boolean => !tile.kind || tile.kind === 'number';

/** Tiles that stay in place and split lines like walls. */
export const isStatic = (tile: Tile): boolean => tile.kind === 'stone' || (tile.frozen ?? 0) > 0;

/** Value produced when `a` and `b` meet, or null if they do not combine. */
export function combine(a: Tile, b: Tile): number | null {
  if (isNumber(a) && isNumber(b)) return a.value === b.value ? a.value * 2 : null;
  if (isNumber(a) && b.kind === 'multiplier') return a.value * 2;
  if (a.kind === 'multiplier' && isNumber(b)) return b.value * 2;
  return null;
}

/** Turns a freshly spawned number tile into a special one, based on `roll` in [0, 1). */
export function specialize(tile: Tile, roll: number, tiles: readonly Tile[]): Tile {
  const count = (kind: Tile['kind']) => tiles.filter((t) => t.kind === kind).length;

  if (roll < 0.03 && count('bomb') === 0) return { ...tile, kind: 'bomb', value: 0, fuse: BOMB_FUSE };
  if (roll < 0.07 && count('multiplier') === 0) return { ...tile, kind: 'multiplier', value: 0 };
  if (roll < 0.1 && count('stone') < MAX_STONES) return { ...tile, kind: 'stone', value: 0 };
  if (roll < 0.15) return { ...tile, frozen: ICE_TURNS };
  return tile;
}

/** Counts down bomb fuses and ice. */
export function tick(tile: Tile): Tile {
  if (tile.frozen) {
    const { frozen, ...rest } = tile;
    return frozen > 1 ? { ...rest, frozen: frozen - 1 } : rest;
  }
  if (tile.kind === 'bomb') return { ...tile, fuse: (tile.fuse ?? BOMB_FUSE) - 1 };
  return tile;
}
