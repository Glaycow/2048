import { nextRandom } from './rng';
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

export function canMove(shape: BoardShape, tiles: readonly Tile[]): boolean {
  if (emptyCells(shape, tiles).length > 0) return true;
  const { size } = shape;
  const grid = toGrid(size, tiles);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const value = grid[row][col]?.value;
      if (value === undefined) continue;
      if (col + 1 < size && grid[row][col + 1]?.value === value) return true;
      if (row + 1 < size && grid[row + 1][col]?.value === value) return true;
    }
  }
  return false;
}

/** Spawns a 2 (90%) or 4 (10%) on a random empty cell. */
export function spawnTile(state: GameState): GameState {
  const cells = emptyCells(state, state.tiles);
  if (cells.length === 0) return state;

  const [pick, s1] = nextRandom(state.rngState);
  const [roll, s2] = nextRandom(s1);
  const [row, col] = cells[Math.floor(pick * cells.length)];
  const tile: Tile = { id: state.nextId, value: roll < 0.9 ? 2 : 4, row, col, isNew: true };

  return { ...state, tiles: [...state.tiles, tile], nextId: state.nextId + 1, rngState: s2 };
}
