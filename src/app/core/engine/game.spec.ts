import { emptyCells, spawnTile } from './board';
import { canMove, createGame, move } from './game';
import { getLayout, LAYOUTS } from './layouts';
import { nextRandom } from './rng';
import { BOMB_FUSE, combine, ICE_TURNS, specialize } from './specials';
import { Direction, GameState, Tile } from './types';

/** -1 marks a blocked cell. */

let id = 100;
function stateFrom(rows: number[][], overrides: Partial<GameState> = {}): GameState {
  const size = rows.length;
  const tiles: Tile[] = [];
  const blocked: number[] = [];
  rows.forEach((cols, row) =>
    cols.forEach((value, col) => {
      if (value === -1) blocked.push(row * size + col);
      else if (value) tiles.push({ id: id++, value, row, col });
    }),
  );
  return {
    mode: 'classic',
    layoutId: 'test',
    size,
    blocked,
    target: 2048,
    specials: false,
    powers: { undo: 1, shuffle: 1, remove: 1, swap: 1 },
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
  for (const cell of result.state.blocked) grid[Math.floor(cell / size)][cell % size] = -1;
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
    const game = createGame(getLayout('classic-4'), 123);
    expect(game.tiles.length).toBe(2);
    expect(game.tiles.every((t) => t.value === 2 || t.value === 4)).toBe(true);
  });

  it('is reproducible from the seed', () => {
    expect(createGame(getLayout('classic-4'), 99)).toEqual(createGame(getLayout('classic-4'), 99));
  });

  it('supports other sizes', () => {
    const game = createGame(getLayout('classic-6'), 1);
    expect(emptyCells(game, game.tiles).length).toBe(34);
  });

  it('never spawns on blocked cells', () => {
    for (const layout of LAYOUTS) {
      for (let seed = 0; seed < 20; seed++) {
        const game = createGame(layout, seed);
        expect(game.tiles.every((t) => !layout.blocked.includes(t.row * layout.size + t.col))).toBe(true);
      }
    }
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

  it('treats blocked cells as walls', () => {
    expect(valuesAfter([[0, 2, -1, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0]).toEqual([
      2, 0, -1, 2,
    ]);
    expect(valuesAfter([[2, -1, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0]).toEqual([
      2, -1, 2, 0,
    ]);
  });

  it('does not merge across a wall', () => {
    const result = move(stateFrom([[2, -1, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.moved).toBe(false);
  });

  it('respects the layout target', () => {
    const result = move(stateFrom([[128, 128, 0], [0, 0, 0], [0, 0, 0]], { target: 256 }), 'left');
    expect(result.state.won).toBe(true);
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
    expect(result.state.over).toBe(!canMove(result.state));
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
    expect(canMove(state)).toBe(false);
  });

  it('ignores blocked cells as free space', () => {
    const state = stateFrom([
      [2, 4, 2],
      [4, -1, 4],
      [2, 4, 2],
    ]);
    expect(canMove(state)).toBe(false);
  });
});

describe('special tiles', () => {
  const at = (row: number, col: number, extra: Partial<Tile>): Tile => ({
    id: id++,
    value: 0,
    row,
    col,
    ...extra,
  });
  const empty4 = () => stateFrom([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const find = (state: GameState, kind: Tile['kind']) => state.tiles.find((t) => t.kind === kind);

  it('multiplier doubles the number it meets', () => {
    const state = { ...empty4(), tiles: [at(0, 0, { value: 8 }), at(0, 3, { kind: 'multiplier' })] };
    const result = move(state, 'left');
    expect(result.gained).toBe(16);
    expect(result.state.tiles.some((t) => t.value === 16 && t.merged)).toBe(true);
    expect(find(result.state, 'multiplier')).toBeUndefined();
  });

  it('combines only compatible kinds', () => {
    expect(combine(at(0, 0, { value: 4 }), at(0, 1, { kind: 'multiplier' }))).toBe(8);
    expect(combine(at(0, 0, { kind: 'bomb' }), at(0, 1, { kind: 'bomb' }))).toBeNull();
    expect(combine(at(0, 0, { kind: 'multiplier' }), at(0, 1, { kind: 'multiplier' }))).toBeNull();
  });

  it('stone stays put and blocks', () => {
    const state = { ...empty4(), tiles: [at(0, 1, { kind: 'stone' }), at(0, 3, { value: 2 })] };
    const result = move(state, 'left');
    expect(find(result.state, 'stone')).toMatchObject({ row: 0, col: 1 });
    expect(result.state.tiles.find((t) => t.value === 2 && !t.isNew)).toMatchObject({ row: 0, col: 2 });
  });

  it('stone breaks when a merge happens next to it', () => {
    const state = {
      ...empty4(),
      tiles: [at(0, 0, { kind: 'stone' }), at(1, 1, { value: 2 }), at(1, 3, { value: 2 })],
    };
    const result = move({ ...state, tiles: [...state.tiles, at(1, 0, { value: 4 })] }, 'right');
    expect(find(result.state, 'stone')).toBeDefined();

    const merged = move({ ...state, tiles: [at(0, 0, { kind: 'stone' }), at(1, 0, { value: 2 }), at(1, 2, { value: 2 })] }, 'left');
    expect(find(merged.state, 'stone')).toBeUndefined();
    expect(merged.destroyed.map((t) => t.kind)).toEqual(['stone']);
  });

  it('frozen tile does not move and thaws over time', () => {
    let state: GameState = {
      ...empty4(),
      tiles: [at(0, 3, { value: 2, frozen: ICE_TURNS }), at(3, 3, { value: 4 })],
    };
    for (let i = 0; i < ICE_TURNS; i++) {
      const dir: Direction = i % 2 ? 'right' : 'left';
      const next = move(state, dir).state;
      state = { ...next, tiles: next.tiles.filter((t) => !t.isNew) };
    }
    const ice = state.tiles.find((t) => t.value === 2)!;
    expect(ice.col).toBe(3);
    expect(ice.frozen).toBeUndefined();
  });

  it('frozen tile does not merge', () => {
    const state = { ...empty4(), tiles: [at(0, 0, { value: 2, frozen: 2 }), at(0, 3, { value: 2 })] };
    const result = move(state, 'left');
    expect(result.gained).toBe(0);
    expect(result.state.tiles.filter((t) => t.value === 2 && !t.isNew).length).toBe(2);
  });

  it('bomb explodes when its fuse runs out, clearing neighbours', () => {
    const state = {
      ...empty4(),
      tiles: [
        at(1, 0, { kind: 'bomb', fuse: 1 }),
        at(0, 0, { value: 8 }),
        at(2, 0, { kind: 'stone' }),
        at(3, 0, { value: 16 }),
        at(1, 3, { value: 2 }),
      ],
    };
    const result = move(state, 'right');
    // Bomb slid next to the 2 at (1, 2) and exploded there.
    expect(find(result.state, 'bomb')).toBeUndefined();
    expect(result.destroyed.some((t) => t.kind === 'bomb')).toBe(true);
    expect(result.state.tiles.some((t) => t.value === 16)).toBe(true);
  });

  it('bomb only removes numbers below 64 (and stones), keeping big tiles and multipliers', () => {
    const state = {
      ...empty4(),
      tiles: [
        at(1, 1, { kind: 'bomb', fuse: 1 }),
        at(0, 0, { value: 32, frozen: 3 }),
        at(0, 1, { value: 64, frozen: 3 }),
        at(0, 2, { value: 128, frozen: 3 }),
        at(1, 0, { kind: 'stone' }),
        at(1, 2, { kind: 'multiplier', frozen: 3 }),
        at(2, 1, { value: 16, frozen: 3 }),
        at(3, 3, { value: 2 }),
      ],
    };
    // Only the 2 in the corner moves; everything around the bomb is frozen or fixed.
    const result = move(state, 'left');
    const left = (v: number) => result.state.tiles.some((t) => t.value === v && !t.isNew);
    expect(find(result.state, 'bomb')).toBeUndefined();
    expect(left(32)).toBe(false);
    expect(left(16)).toBe(false);
    expect(find(result.state, 'stone')).toBeUndefined();
    expect(left(64)).toBe(true);
    expect(left(128)).toBe(true);
    expect(find(result.state, 'multiplier')).toBeDefined();
  });

  it('bomb fuse counts down', () => {
    const state = { ...empty4(), tiles: [at(0, 3, { kind: 'bomb', fuse: BOMB_FUSE })] };
    expect(find(move(state, 'left').state, 'bomb')?.fuse).toBe(BOMB_FUSE - 1);
  });

  it('specialize respects limits', () => {
    const base = at(0, 0, { value: 2 });
    expect(specialize(base, 0.01, []).kind).toBe('bomb');
    expect(specialize(base, 0.01, [at(1, 1, { kind: 'bomb' })]).kind).toBe('multiplier');
    expect(specialize(base, 0.12, []).frozen).toBe(ICE_TURNS);
    expect(specialize(base, 0.5, [])).toBe(base);
  });

  it('spawns specials only when enabled and after a few moves', () => {
    const count = (specials: boolean, moves: number) => {
      let n = 0;
      for (let seed = 0; seed < 300; seed++) {
        const tile = spawnTile({ ...empty4(), specials, moves, rngState: seed }).tiles[0];
        if (tile.kind || tile.frozen) n++;
      }
      return n;
    };
    expect(count(false, 50)).toBe(0);
    expect(count(true, 0)).toBe(0);
    expect(count(true, 50)).toBeGreaterThan(0);
  });

  it('a board full of immovable pieces is over', () => {
    const state = stateFrom([[2, 4], [4, 2]]);
    const stuck = { ...state, tiles: state.tiles.map((t) => ({ ...t, frozen: 2 })) };
    expect(canMove(stuck)).toBe(false);
  });
});
