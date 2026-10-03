import { isBlocked, spawnTile, toGrid } from './board';
import { INITIAL_POWERS, recharge } from './powers';
import { combine, isNumber, isStatic, tick } from './specials';
import {
  BoardLayout,
  Direction,
  DIRECTIONS,
  GameOptions,
  GameState,
  MoveResult,
  Tile,
} from './types';

export function createGame(
  layout: BoardLayout,
  seed: number,
  options: GameOptions = { specials: false },
): GameState {
  const mode = options.mode ?? 'classic';
  const empty: GameState = {
    mode,
    layoutId: layout.id,
    size: layout.size,
    blocked: layout.blocked,
    target: layout.target,
    specials: options.specials,
    powers: options.powers ?? INITIAL_POWERS,
    tiles: [],
    score: 0,
    moves: 0,
    won: false,
    over: false,
    // Only classic, daily and puzzle stop at the target tile.
    keepPlaying: mode === 'timed' || mode === 'zen',
    nextId: 1,
    rngState: seed,
  };
  return spawnTile(spawnTile(empty));
}

/** Cell coordinates of line `index`, ordered from the edge tiles slide towards. */
function lineCells(size: number, direction: Direction, index: number): [number, number][] {
  return Array.from({ length: size }, (_, k): [number, number] => {
    switch (direction) {
      case 'left':
        return [index, k];
      case 'right':
        return [index, size - 1 - k];
      case 'up':
        return [k, index];
      case 'down':
        return [size - 1 - k, index];
    }
  });
}

interface SlideResult {
  readonly tiles: Tile[];
  readonly consumed: Tile[];
  readonly mergeCells: [number, number][];
  readonly gained: number;
  readonly moved: boolean;
  readonly nextId: number;
}

/** Slides and merges tiles; blocked cells, stones and frozen tiles act as walls. */
function slide(state: GameState, direction: Direction): SlideResult {
  const { size } = state;
  const grid = toGrid(size, state.tiles);
  const tiles: Tile[] = [];
  const consumed: Tile[] = [];
  const mergeCells: [number, number][] = [];
  let nextId = state.nextId;
  let gained = 0;
  let moved = false;

  const settle = (t: Tile, row: number, col: number): Tile => {
    const { isNew, merged, exploding, ...rest } = t;
    return { ...rest, row, col };
  };

  for (let index = 0; index < size; index++) {
    const runs: [number, number][][] = [[]];
    for (const [r, c] of lineCells(size, direction, index)) {
      const tile = grid[r][c];
      if (isBlocked(state, r, c) || (tile && isStatic(tile))) {
        if (tile) tiles.push(settle(tile, r, c));
        runs.push([]);
      } else {
        runs[runs.length - 1].push([r, c]);
      }
    }

    for (const cells of runs) {
      const line = cells.map(([r, c]) => grid[r][c]).filter((t): t is Tile => t !== null);
      let target = 0;

      for (let k = 0; k < line.length; target++) {
        const [row, col] = cells[target];
        const current = line[k];
        const next = line[k + 1];
        const value = next ? combine(current, next) : null;

        if (next && value !== null) {
          tiles.push({ id: nextId++, value, row, col, merged: true });
          consumed.push(settle(current, row, col), settle(next, row, col));
          mergeCells.push([row, col]);
          gained += value;
          moved = true;
          k += 2;
        } else {
          if (current.row !== row || current.col !== col) moved = true;
          tiles.push(settle(current, row, col));
          k += 1;
        }
      }
    }
  }

  return { tiles, consumed, mergeCells, gained, moved, nextId };
}

const touches = (t: Tile, [row, col]: [number, number]) =>
  Math.abs(t.row - row) + Math.abs(t.col - col) === 1;

const inBlast = (t: Tile, bomb: Tile) =>
  Math.abs(t.row - bomb.row) <= 1 && Math.abs(t.col - bomb.col) <= 1;

export function canMove(state: GameState): boolean {
  return DIRECTIONS.some((direction) => slide(state, direction).moved);
}

/**
 * Applies end-of-turn rules: game over when stuck, the puzzle move limit,
 * and zen relief (clears the smallest tiles instead of ending).
 */
export function finalize(state: GameState): { state: GameState; removed: Tile[] } {
  let next = state;
  const removed: Tile[] = [];

  if (!canMove(next)) {
    if (next.mode === 'zen') {
      const numbers = next.tiles.filter(isNumber);
      const smallest = Math.min(...numbers.map((t) => t.value));
      const keep = next.tiles.filter((t) => {
        // With no number tiles left, clear the specials instead.
        const clear = numbers.length === 0 || (isNumber(t) && t.value === smallest);
        if (clear) removed.push({ ...t, exploding: true });
        return !clear;
      });
      next = { ...next, tiles: keep };
    } else {
      return { state: { ...next, over: true, endReason: 'stuck' }, removed };
    }
  }

  if (next.mode === 'puzzle' && !next.won && next.moveLimit !== undefined && next.moves >= next.moveLimit) {
    return { state: { ...next, over: true, endReason: 'moves' }, removed };
  }

  return { state: { ...next, over: false, endReason: undefined }, removed };
}

/** Timed mode: counts the clock down, ending the game at zero. */
export function elapse(state: GameState, ms: number): GameState {
  if (state.mode !== 'timed' || state.over || state.timeLeft === undefined) return state;
  const timeLeft = Math.max(0, state.timeLeft - ms);
  return timeLeft > 0
    ? { ...state, timeLeft }
    : { ...state, timeLeft, over: true, endReason: 'time' };
}

export function move(state: GameState, direction: Direction): MoveResult {
  const slid = slide(state, direction);
  if (!slid.moved) return { state, moved: false, gained: 0, consumed: [], destroyed: [] };

  const destroyed: Tile[] = [];
  const destroy = (t: Tile) => destroyed.push({ ...t, exploding: true });

  // Stones break when a merge happens right next to them.
  let tiles = slid.tiles.filter((t) => {
    const breaks = t.kind === 'stone' && slid.mergeCells.some((cell) => touches(t, cell));
    if (breaks) destroy(t);
    return !breaks;
  });

  tiles = tiles.map(tick);

  const bombs = tiles.filter((t) => t.kind === 'bomb' && (t.fuse ?? 0) <= 0);
  if (bombs.length > 0) {
    tiles = tiles.filter((t) => {
      const hit = bombs.some((bomb) => inBlast(t, bomb));
      if (hit) destroy(t);
      return !hit;
    });
  }

  const afterMove: GameState = {
    ...state,
    tiles,
    nextId: slid.nextId,
    score: state.score + slid.gained,
    moves: state.moves + 1,
    powers: recharge(state.powers, state.moves + 1),
    won: state.won || tiles.some((t) => t.value >= state.target),
  };
  const final = finalize(spawnTile(afterMove));

  return {
    state: final.state,
    moved: true,
    gained: slid.gained,
    consumed: slid.consumed,
    destroyed: [...destroyed, ...final.removed],
  };
}

export function continueAfterWin(state: GameState): GameState {
  return { ...state, keepPlaying: true };
}
