import { canMove, isBlocked, spawnTile, toGrid } from './board';
import { BoardLayout, Direction, GameState, MoveResult, Tile } from './types';

export function createGame(layout: BoardLayout, seed: number): GameState {
  const empty: GameState = {
    layoutId: layout.id,
    size: layout.size,
    blocked: layout.blocked,
    target: layout.target,
    tiles: [],
    score: 0,
    moves: 0,
    won: false,
    over: false,
    keepPlaying: false,
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

/** Splits a line into runs of open cells; blocked cells act as walls. */
function segments(state: GameState, cells: [number, number][]): [number, number][][] {
  const runs: [number, number][][] = [[]];
  for (const cell of cells) {
    if (isBlocked(state, cell[0], cell[1])) runs.push([]);
    else runs[runs.length - 1].push(cell);
  }
  return runs.filter((run) => run.length > 0);
}

export function move(state: GameState, direction: Direction): MoveResult {
  const { size } = state;
  const grid = toGrid(size, state.tiles);
  const tiles: Tile[] = [];
  const consumed: Tile[] = [];
  let nextId = state.nextId;
  let gained = 0;
  let moved = false;

  for (let index = 0; index < size; index++) {
    for (const cells of segments(state, lineCells(size, direction, index))) {
      const line = cells.map(([r, c]) => grid[r][c]).filter((t): t is Tile => t !== null);
      let target = 0;

      for (let k = 0; k < line.length; target++) {
        const [row, col] = cells[target];
        const current = line[k];
        const next = line[k + 1];

        if (next && next.value === current.value) {
          const value = current.value * 2;
          tiles.push({ id: nextId++, value, row, col, merged: true });
          consumed.push({ ...current, row, col, isNew: false, merged: false });
          consumed.push({ ...next, row, col, isNew: false, merged: false });
          gained += value;
          moved = true;
          k += 2;
        } else {
          if (current.row !== row || current.col !== col) moved = true;
          tiles.push({ id: current.id, value: current.value, row, col });
          k += 1;
        }
      }
    }
  }

  if (!moved) return { state, moved: false, gained: 0, consumed: [] };

  const afterMove: GameState = {
    ...state,
    tiles,
    nextId,
    score: state.score + gained,
    moves: state.moves + 1,
    won: state.won || tiles.some((t) => t.value >= state.target),
  };
  const next = spawnTile(afterMove);

  return {
    state: { ...next, over: !canMove(next, next.tiles) },
    moved: true,
    gained,
    consumed,
  };
}

export function continueAfterWin(state: GameState): GameState {
  return { ...state, keepPlaying: true };
}
