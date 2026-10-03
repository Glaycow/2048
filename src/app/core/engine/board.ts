import { nextRandom } from './rng';
import { SPECIALS_FROM_MOVE, specialize } from './specials';
import { GameState, Tile } from './types';

export type Grid = (Tile | null)[][];

export interface BoardShape {
  readonly size: number;
  readonly blocked: readonly number[];
}

export function isBlocked(shape: BoardShape, row: number, col: number): boolean {
  return shape.blocked.includes(row * shape.size + col);
}

export function toGrid(size: number, tiles: readonly Tile[]): Grid {
  const grid: Grid = Array.from({ length: size }, () => Array<Tile | null>(size).fill(null));
  for (const tile of tiles) grid[tile.row][tile.col] = tile;
  return grid;
}

export function emptyCells(shape: BoardShape, tiles: readonly Tile[]): [row: number, col: number][] {
  const grid = toGrid(shape.size, tiles);
  const cells: [number, number][] = [];
  for (let row = 0; row < shape.size; row++) {
    for (let col = 0; col < shape.size; col++) {
      if (!grid[row][col] && !isBlocked(shape, row, col)) cells.push([row, col]);
    }
  }
  return cells;
}

/** Spawns a 2 (90%) or 4 (10%) on a random empty cell, possibly as a special tile. */
export function spawnTile(state: GameState): GameState {
  const { avoidSpawn: avoid, ...rest } = state;
  let cells = emptyCells(state, state.tiles);
  if (cells.length === 0) return rest;
  if (avoid && cells.length > 1) cells = cells.filter(([r, c]) => r !== avoid.row || c !== avoid.col);

  const [pick, s1] = nextRandom(state.rngState);
  const [roll, s2] = nextRandom(s1);
  const [special, s3] = nextRandom(s2);
  const [row, col] = cells[Math.floor(pick * cells.length)];
  let value = roll < 0.9 ? 2 : 4;
  if (avoid && value === avoid.value) value = value === 2 ? 4 : 2;
  let tile: Tile = { id: state.nextId, value, row, col, isNew: true };
  if (state.specials && state.moves >= SPECIALS_FROM_MOVE) tile = specialize(tile, special, state.tiles);

  return {
    ...rest,
    tiles: [...state.tiles, tile],
    nextId: state.nextId + 1,
    rngState: s3,
    lastSpawn: { row, col, value: tile.value },
  };
}
