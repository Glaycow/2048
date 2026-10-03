import { canMove, elapse, move } from './game';
import { createModeGame, createPuzzle, dailySeed, PUZZLES, TIME_LIMIT_MS, todayKey } from './modes';
import { DIRECTIONS, GameState } from './types';

const boardKey = (s: GameState) =>
  s.tiles
    .map((t) => `${t.row},${t.col},${t.kind ?? ''}${t.value},${t.frozen ?? ''}`)
    .sort()
    .join('|') + `#${s.moves}`;

/** Fewest moves that reach the puzzle goal (breadth-first), or Infinity. */
function solve(start: GameState, maxDepth: number): number {
  let frontier = [start];
  const seen = new Set<string>();
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: GameState[] = [];
    for (const state of frontier) {
      for (const dir of DIRECTIONS) {
        const result = move(state, dir);
        if (!result.moved) continue;
        if (result.state.won) return depth;
        if (result.state.over) continue;
        const key = boardKey(result.state);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(result.state);
      }
    }
    frontier = next;
  }
  return Infinity;
}

describe('modes', () => {
  it('daily seed is stable per date and differs between dates', () => {
    expect(dailySeed('2026-10-03')).toBe(dailySeed('2026-10-03'));
    expect(dailySeed('2026-10-03')).not.toBe(dailySeed('2026-10-04'));
    const config = { mode: 'daily' as const, layoutId: 'classic-8', specials: false, date: '2026-10-03' };
    const a = createModeGame(config, 1);
    const b = createModeGame(config, 999);
    expect(a.tiles).toEqual(b.tiles);
    expect(a.layoutId).toBe('classic-4');
    expect(a.specials).toBe(true);
  });

  it('todayKey formats the local date', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('timed mode counts down and ends at zero', () => {
    const game = createModeGame({ mode: 'timed', layoutId: 'classic-4', specials: false }, 1);
    expect(game.timeLeft).toBe(TIME_LIMIT_MS);
    expect(game.keepPlaying).toBe(true);
    const later = elapse(game, 1000);
    expect(later.timeLeft).toBe(TIME_LIMIT_MS - 1000);
    const done = elapse(game, TIME_LIMIT_MS + 5);
    expect(done).toMatchObject({ timeLeft: 0, over: true, endReason: 'time' });
    expect(elapse(done, 1000)).toBe(done);
  });

  it('elapse ignores other modes', () => {
    const game = createModeGame({ mode: 'classic', layoutId: 'classic-4', specials: false }, 1);
    expect(elapse(game, 1000)).toBe(game);
  });

  it('zen never ends: it clears the smallest tiles instead', () => {
    const base = createModeGame({ mode: 'zen', layoutId: 'classic-4', specials: false }, 3);
    const values = [
      [8, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 0],
    ];
    let id = 1;
    const tiles = values.flatMap((r, row) =>
      r.flatMap((value, col) => (value ? [{ id: id++, value, row, col }] : [])),
    );
    // Moving right fills the last hole; whatever spawns, the board locks.
    const state: GameState = { ...base, tiles, nextId: 100 };
    let result = move(state, 'down');
    if (!result.moved) result = move(state, 'right');
    expect(result.state.over).toBe(false);
    expect(canMove(result.state)).toBe(true);
  });

  it('puzzle fails when moves run out', () => {
    const level = { ...PUZZLES[0], moveLimit: 1, grid: ['4 4 . .', '. . . .', '. . . .', '. . . .'] };
    const result = move(createPuzzle(level), 'left');
    expect(result.state).toMatchObject({ over: true, endReason: 'moves', won: false });
  });

  it('puzzle wins on the goal tile', () => {
    const result = move(move(createPuzzle(PUZZLES[0]), 'left').state, 'left');
    expect(result.state.won).toBe(true);
    expect(result.state.keepPlaying).toBe(false);
  });

  for (const level of PUZZLES) {
    it(`puzzle "${level.name}" is solvable within its move limit`, () => {
      const start = createPuzzle(level);
      expect(start.tiles.length).toBeGreaterThan(0);
      expect(solve(start, level.moveLimit)).toBeLessThanOrEqual(level.moveLimit);
    });
  }
});
