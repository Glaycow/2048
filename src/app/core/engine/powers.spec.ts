import { canMove, move } from './game';
import {
  INITIAL_POWERS,
  POWER_MAX,
  recharge,
  RECHARGE_EVERY,
  removeTile,
  shuffleTiles,
  swapTiles,
  undoTo,
} from './powers';
import { GameState, Tile } from './types';

let id = 1;
function stateFrom(rows: number[][], overrides: Partial<GameState> = {}): GameState {
  const tiles: Tile[] = [];
  rows.forEach((cols, row) => cols.forEach((value, col) => value && tiles.push({ id: id++, value, row, col })));
  return {
    layoutId: 'test',
    size: rows.length,
    blocked: [],
    target: 2048,
    specials: false,
    powers: { undo: 1, shuffle: 1, remove: 1, swap: 1 },
    tiles,
    score: 0,
    moves: 0,
    won: false,
    over: false,
    keepPlaying: false,
    nextId: 1000,
    rngState: 5,
    ...overrides,
  };
}

const locked = () =>
  stateFrom([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);

describe('powers', () => {
  it('recharges every few moves up to the cap', () => {
    const full = { undo: POWER_MAX, shuffle: 0, remove: 1, swap: 2 };
    expect(recharge(full, RECHARGE_EVERY - 1)).toBe(full);
    expect(recharge(full, RECHARGE_EVERY)).toEqual({ undo: POWER_MAX, shuffle: 1, remove: 2, swap: 3 });
  });

  it('move applies recharge', () => {
    const state = stateFrom([[0, 2], [0, 0]], { moves: RECHARGE_EVERY - 1, powers: { ...INITIAL_POWERS, shuffle: 0 } });
    expect(move(state, 'left').state.powers.shuffle).toBe(1);
  });

  it('remove deletes a tile, spends a charge and can rescue a locked board', () => {
    const state = { ...locked(), over: true };
    const target = state.tiles[0];
    const next = removeTile(state, target.id);
    expect(next.tiles.some((t) => t.id === target.id)).toBe(false);
    expect(next.powers.remove).toBe(0);
    expect(next.over).toBe(false);
  });

  it('powers do nothing without charges', () => {
    const state = { ...locked(), powers: { undo: 0, shuffle: 0, remove: 0, swap: 0 } };
    expect(removeTile(state, state.tiles[0].id)).toBe(state);
    expect(shuffleTiles(state)).toBe(state);
    expect(swapTiles(state, state.tiles[0].id, state.tiles[1].id)).toBe(state);
  });

  it('swap exchanges positions', () => {
    const state = locked();
    const [a, b] = state.tiles;
    const next = swapTiles(state, a.id, b.id);
    expect(next.tiles.find((t) => t.id === a.id)).toMatchObject({ row: b.row, col: b.col });
    expect(next.tiles.find((t) => t.id === b.id)).toMatchObject({ row: a.row, col: a.col });
    expect(next.over).toBe(false);
    expect(next.powers.swap).toBe(0);
  });

  it('swap ignores the same tile or unknown ids', () => {
    const state = locked();
    expect(swapTiles(state, state.tiles[0].id, state.tiles[0].id)).toBe(state);
    expect(swapTiles(state, state.tiles[0].id, -5)).toBe(state);
  });

  it('shuffle keeps the same tiles and cells and prefers a playable board', () => {
    const state = locked();
    const next = shuffleTiles(state);
    const key = (t: Tile) => `${t.row},${t.col}`;
    expect(next.tiles.map(key).sort()).toEqual(state.tiles.map(key).sort());
    expect(next.tiles.map((t) => t.id).sort()).toEqual(state.tiles.map((t) => t.id).sort());
    expect(canMove(next)).toBe(true);
    expect(next.powers.shuffle).toBe(0);
  });

  it('shuffle leaves stones in place', () => {
    const state = locked();
    const stone: Tile = { id: 999, value: 0, row: 0, col: 0, kind: 'stone' };
    const withStone = { ...state, tiles: [stone, ...state.tiles.slice(1)] };
    expect(shuffleTiles(withStone).tiles.find((t) => t.id === 999)).toMatchObject({ row: 0, col: 0 });
  });

  it('undo restores the previous state and keeps current charges minus one', () => {
    const before = stateFrom([[0, 2], [0, 0]]);
    const after = { ...move(before, 'left').state, powers: { undo: 2, shuffle: 3, remove: 0, swap: 1 } };
    const restored = undoTo(after, before);
    expect(restored.tiles).toEqual(before.tiles);
    expect(restored.powers).toEqual({ undo: 1, shuffle: 3, remove: 0, swap: 1 });
  });
});
