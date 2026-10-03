import { canMove, finalize } from './game';
import { nextRandom } from './rng';
import { GameState, PowerId, Powers, Tile } from './types';

export const POWER_IDS: readonly PowerId[] = ['undo', 'swap', 'remove', 'shuffle'];
export const POWER_MAX = 3;
export const RECHARGE_EVERY = 25;
export const INITIAL_POWERS: Powers = { undo: 2, shuffle: 1, remove: 1, swap: 1 };

/** Every RECHARGE_EVERY moves, each power gains a charge up to POWER_MAX. */
export function recharge(powers: Powers, moves: number): Powers {
  if (moves === 0 || moves % RECHARGE_EVERY !== 0) return powers;
  return Object.fromEntries(
    POWER_IDS.map((id) => [id, Math.min(POWER_MAX, powers[id] + 1)]),
  ) as Record<PowerId, number>;
}

export function canUse(state: GameState, id: PowerId): boolean {
  return state.powers[id] > 0;
}

function spend(state: GameState, id: PowerId, tiles: readonly Tile[], rngState = state.rngState): GameState {
  const next: GameState = {
    ...state,
    tiles,
    rngState,
    powers: { ...state.powers, [id]: state.powers[id] - 1 },
  };
  return finalize(next).state;
}

const clean = (t: Tile): Tile => {
  const { isNew, merged, exploding, ...rest } = t;
  return rest;
};

/** Randomly rearranges movable tiles among the cells they occupy. Stones stay put. */
export function shuffleTiles(state: GameState): GameState {
  if (!canUse(state, 'shuffle')) return state;

  const fixed = state.tiles.filter((t) => t.kind === 'stone');
  const movable = state.tiles.filter((t) => t.kind !== 'stone').map(clean);
  const cells = movable.map((t) => [t.row, t.col] as const);
  let rng = state.rngState;
  let best: Tile[] = movable;

  // Prefer an arrangement that leaves a move available.
  for (let attempt = 0; attempt < 12; attempt++) {
    const order = [...movable];
    for (let i = order.length - 1; i > 0; i--) {
      const [r, next] = nextRandom(rng);
      rng = next;
      const j = Math.floor(r * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    best = order.map((t, i) => ({ ...t, row: cells[i][0], col: cells[i][1] }));
    if (canMove({ ...state, tiles: [...fixed, ...best] })) break;
  }

  return spend(state, 'shuffle', [...fixed, ...best], rng);
}

export function removeTile(state: GameState, tileId: number): GameState {
  if (!canUse(state, 'remove') || !state.tiles.some((t) => t.id === tileId)) return state;
  return spend(
    state,
    'remove',
    state.tiles.filter((t) => t.id !== tileId).map(clean),
  );
}

export function swapTiles(state: GameState, a: number, b: number): GameState {
  const first = state.tiles.find((t) => t.id === a);
  const second = state.tiles.find((t) => t.id === b);
  if (!canUse(state, 'swap') || !first || !second || a === b) return state;

  return spend(
    state,
    'swap',
    state.tiles.map((t) => {
      if (t.id === a) return clean({ ...t, row: second.row, col: second.col });
      if (t.id === b) return clean({ ...t, row: first.row, col: first.col });
      return clean(t);
    }),
  );
}

/** Restores `previous`, keeping the current charges minus one undo. */
export function undoTo(current: GameState, previous: GameState): GameState {
  if (!canUse(current, 'undo')) return current;
  return {
    ...previous,
    tiles: previous.tiles.map(clean),
    powers: { ...current.powers, undo: current.powers.undo - 1 },
  };
}
