import { canMove, emptyCells } from './board';
import { createGame, move } from './game';
import { nextRandom } from './rng';
import { Direction, GameState, Tile } from './types';

let id = 100;
function stateFrom(rows: number[][], overrides: Partial<GameState> = {}): GameState {
  const tiles: Tile[] = [];
  rows.forEach((cols, row) =>
    cols.forEach((value, col) => value && tiles.push({ id: id++, value, row, col })),
  );
  return {
    size: rows.length,
    tiles,
    score: 0,
    moves: 0,
    won: false,
    over: false,
    keepPlaying: false,
    nextId: 1,
    rngState: 42,
    ...overrides,
  };
}

/** Grid of values after a move, ignoring the spawned tile. */
function valuesAfter(rows: number[][], direction: Direction): number[][] {
  const result = move(stateFrom(rows), direction);
  const size = rows.length;
  const grid = Array.from({ length: size }, () => Array<number>(size).fill(0));
  for (const t of result.state.tiles) if (!t.isNew) grid[t.row][t.col] = t.value;
  return grid;
}

describe('rng', () => {
  it('is deterministic', () => {
    expect(nextRandom(7)).toEqual(nextRandom(7));
    const [value] = nextRandom(7);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

describe('createGame', () => {
  it('starts with two tiles', () => {
    const game = createGame(4, 123);
    expect(game.tiles.length).toBe(2);
    expect(game.tiles.every((t) => t.value === 2 || t.value === 4)).toBe(true);
  });

  it('is reproducible from the seed', () => {
    expect(createGame(4, 99)).toEqual(createGame(4, 99));
  });

  it('supports other sizes', () => {
    expect(emptyCells(6, createGame(6, 1).tiles).length).toBe(34);
  });
});

describe('move', () => {
  it('slides tiles to the edge', () => {
    expect(
      valuesAfter(
        [
          [0, 0, 2, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        'left',
      )[0],
    ).toEqual([2, 0, 0, 0]);
  });

  it('merges equal tiles once per move', () => {
    expect(valuesAfter([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0]).toEqual([
      4, 4, 0, 0,
    ]);
    expect(valuesAfter([[4, 4, 8, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0]).toEqual([
      8, 8, 0, 0,
    ]);
  });

  it('merges starting from the destination edge', () => {
    expect(valuesAfter([[2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'right')[0]).toEqual([
      0, 0, 2, 4,
    ]);
  });

  it('moves vertically', () => {
    const grid = valuesAfter(
      [
        [2, 0, 0, 0],
        [2, 0, 0, 0],
        [4, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      'down',
    );
    expect(grid.map((r) => r[0])).toEqual([0, 0, 4, 4]);
  });

  it('scores merged values and reports consumed tiles', () => {
    const result = move(stateFrom([[2, 2, 4, 4], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.gained).toBe(12);
    expect(result.state.score).toBe(12);
    expect(result.consumed.length).toBe(4);
    expect(result.state.tiles.filter((t) => t.merged).length).toBe(2);
  });

  it('does nothing when no tile can move', () => {
    const state = stateFrom([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const result = move(state, 'left');
    expect(result.moved).toBe(false);
    expect(result.state).toBe(state);
  });

  it('spawns a tile after a valid move', () => {
    const result = move(stateFrom([[0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.state.tiles.length).toBe(2);
    expect(result.state.moves).toBe(1);
  });

  it('flags a win at 2048', () => {
    const result = move(stateFrom([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.state.won).toBe(true);
  });

  it('flags game over when the board locks', () => {
    const result = move(
      stateFrom([
        [2, 4, 2, 0],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2],
      ]),
      'right',
    );
    expect(result.moved).toBe(true);
    expect(result.state.tiles.length).toBe(16);
    expect(result.state.over).toBe(!canMove(4, result.state.tiles));
  });
});

describe('canMove', () => {
  it('detects a locked board', () => {
    const state = stateFrom([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(canMove(4, state.tiles)).toBe(false);
  });
});
