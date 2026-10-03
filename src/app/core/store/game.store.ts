import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import {
  continueAfterWin,
  createModeGame,
  DEFAULT_LAYOUT_ID,
  Direction,
  elapse,
  GameState,
  getLayout,
  getMode,
  getPuzzle,
  LAYOUTS,
  ModeId,
  move,
  PowerId,
  PUZZLES,
  randomSeed,
  removeTile,
  shuffleTiles,
  StartConfig,
  swapTiles,
  Tile,
  todayKey,
  undoTo,
} from '../engine';
import { PersistenceService } from './persistence.service';

export const SLIDE_MS = 110;
const BLAST_MS = 450;
const HISTORY_LIMIT = 20;

export type TargetPower = Extract<PowerId, 'remove' | 'swap'>;

export interface Targeting {
  readonly power: TargetPower;
  /** First tile picked when swapping. */
  readonly first?: number;
}

/** Key for the best score of a game; null when the mode keeps no record. */
export function bestKey(state: Pick<GameState, 'mode' | 'layoutId' | 'specials' | 'date'>): string | null {
  const board = state.specials ? `${state.layoutId}+especiais` : state.layoutId;
  switch (state.mode) {
    case 'classic':
      return board;
    case 'timed':
      return `tempo:${board}`;
    case 'zen':
      return `zen:${board}`;
    case 'daily':
      return `diario:${state.date}`;
    case 'puzzle':
      return null;
  }
}

@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly persistence = inject(PersistenceService);

  readonly prefs = signal(this.persistence.loadPrefs());

  private readonly state = signal<GameState>(
    this.persistence.loadState() ??
      createModeGame(
        { mode: 'classic', layoutId: DEFAULT_LAYOUT_ID, specials: this.prefs().specials },
        randomSeed(),
      ),
  );
  private readonly history = signal<readonly GameState[]>([]);
  private readonly ghosts = signal<readonly Tile[]>([]);
  private ghostTimer?: ReturnType<typeof setTimeout>;

  readonly layouts = LAYOUTS;
  readonly puzzles = PUZZLES;
  readonly bestScores = signal(this.persistence.loadBest());
  /** Puzzle id → fewest moves used to solve it. */
  readonly puzzleProgress = signal(this.persistence.loadPuzzles());
  readonly lastGain = signal<{ value: number; key: number } | null>(null);
  readonly targeting = signal<Targeting | null>(null);

  readonly mode = computed(() => this.state().mode);
  readonly modeInfo = computed(() => getMode(this.state().mode));
  readonly layout = computed(() => getLayout(this.state().layoutId));
  readonly size = computed(() => this.state().size);
  readonly blocked = computed(() => new Set(this.state().blocked));
  readonly target = computed(() => this.state().target);
  readonly score = computed(() => this.state().score);
  readonly specials = computed(() => this.state().specials);
  readonly date = computed(() => this.state().date);
  readonly timeLeft = computed(() => this.state().timeLeft);
  readonly puzzle = computed(() => getPuzzle(this.state().levelId));
  readonly movesLeft = computed(() => {
    const { moveLimit, moves } = this.state();
    return moveLimit === undefined ? undefined : Math.max(0, moveLimit - moves);
  });
  readonly nextPuzzle = computed(() => {
    const index = PUZZLES.findIndex((p) => p.id === this.state().levelId);
    return index >= 0 ? PUZZLES[index + 1] : undefined;
  });
  readonly bestKey = computed(() => bestKey(this.state()));
  readonly best = computed(() => {
    const key = this.bestKey();
    return key ? (this.bestScores()[key] ?? 0) : 0;
  });
  readonly moves = computed(() => this.state().moves);
  readonly over = computed(() => this.state().over);
  readonly endReason = computed(() => this.state().endReason);
  readonly showWin = computed(() => this.state().won && !this.state().keepPlaying);
  readonly locked = computed(() => this.over() || this.showWin() || this.targeting() !== null);
  readonly showOver = computed(() => this.over() && this.targeting() === null);
  /** The clock runs once the first move is made. */
  readonly clockRunning = computed(() => this.mode() === 'timed' && this.moves() > 0 && !this.over());
  readonly hasSpecialTiles = computed(() => this.state().tiles.some((t) => t.kind || t.frozen));
  readonly maxTile = computed(() => Math.max(0, ...this.state().tiles.map((t) => t.value)));
  readonly powers = computed(() => this.state().powers);
  /** Whether each power can be used right now. */
  readonly available = computed(() => {
    const powers = this.powers();
    const busy = this.showWin() || this.endReason() === 'time';
    const tiles = this.state().tiles.length;
    return {
      undo: !busy && powers.undo > 0 && this.history().length > 0,
      shuffle: !busy && powers.shuffle > 0 && tiles > 1,
      remove: !busy && powers.remove > 0 && tiles > 0,
      swap: !busy && powers.swap > 0 && tiles > 1,
    } satisfies Record<PowerId, boolean>;
  });
  /** Ghosts first so live tiles render above them. */
  readonly tiles = computed(() => [...this.ghosts(), ...this.state().tiles]);
  readonly ghostIds = computed(() => new Set(this.ghosts().map((t) => t.id)));
  readonly hasProgress = computed(() => this.moves() > 0 && !this.over() && !this.showWin());

  constructor() {
    effect(() => this.persistence.saveState(this.state()));
    effect(() => this.persistence.saveBest(this.bestScores()));
    effect(() => this.persistence.savePrefs(this.prefs()));
    effect(() => this.persistence.savePuzzles(this.puzzleProgress()));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.ghostTimer));
  }

  /** Best score of `layoutId` in the current mode, for the board picker. */
  bestFor(layoutId: string, specials: boolean): number {
    const key = bestKey({ ...this.state(), layoutId, specials });
    return key ? (this.bestScores()[key] ?? 0) : 0;
  }

  move(direction: Direction): void {
    if (this.locked()) return;
    const result = move(this.state(), direction);
    if (!result.moved) return;

    this.commit(result.state);
    this.showGhosts([...result.consumed, ...result.destroyed]);

    if (result.gained > 0) this.lastGain.set({ value: result.gained, key: result.state.moves });
    this.recordBest();
    this.recordPuzzle();
  }

  /** Starts a new game; omitted fields keep the current game's settings. */
  start(config: Partial<StartConfig> & { mode?: ModeId } = {}): void {
    const current = this.state();
    const mode = config.mode ?? current.mode;
    const fixedBoard = current.mode === 'puzzle' || current.mode === 'daily';
    const full: StartConfig = {
      mode,
      layoutId: config.layoutId ?? (fixedBoard ? DEFAULT_LAYOUT_ID : current.layoutId),
      specials: config.specials ?? this.prefs().specials,
      levelId: config.levelId ?? (mode === 'puzzle' ? current.levelId : undefined),
      date: config.date ?? (mode === 'daily' ? todayKey() : undefined),
    };

    clearTimeout(this.ghostTimer);
    this.ghosts.set([]);
    this.history.set([]);
    this.targeting.set(null);
    this.lastGain.set(null);
    this.state.set(createModeGame(full, randomSeed()));
  }

  /** Restarts the current game with the same settings (same day for the daily). */
  restart(): void {
    const { mode, layoutId, specials, levelId, date } = this.state();
    this.start({ mode, layoutId, specials, levelId, date });
  }

  setSpecials(specials: boolean): void {
    this.prefs.update((prefs) => ({ ...prefs, specials }));
    this.start({ specials });
  }

  keepPlaying(): void {
    this.state.update(continueAfterWin);
  }

  /** Timed mode clock. */
  tick(ms: number): void {
    if (!this.clockRunning()) return;
    this.state.update((s) => elapse(s, ms));
    if (this.over()) this.targeting.set(null);
  }

  usePower(power: PowerId): void {
    if (!this.available()[power]) return;
    switch (power) {
      case 'undo': {
        const history = this.history();
        this.cancelTargeting();
        this.state.set(undoTo(this.state(), history[history.length - 1]));
        this.history.set(history.slice(0, -1));
        this.ghosts.set([]);
        break;
      }
      case 'shuffle':
        this.cancelTargeting();
        this.commit(shuffleTiles(this.state()));
        break;
      case 'remove':
      case 'swap':
        this.targeting.update((t) => (t?.power === power ? null : { power }));
        break;
    }
  }

  /** Handles a tile click while a targeted power is active. */
  pickTile(id: number): void {
    const targeting = this.targeting();
    if (!targeting) return;

    if (targeting.power === 'remove') {
      const tile = this.state().tiles.find((t) => t.id === id);
      this.targeting.set(null);
      this.commit(removeTile(this.state(), id));
      if (tile) this.showGhosts([{ ...tile, exploding: true }]);
      return;
    }

    if (targeting.first === undefined) {
      this.targeting.set({ ...targeting, first: id });
    } else if (targeting.first === id) {
      this.targeting.set({ power: 'swap' });
    } else {
      this.targeting.set(null);
      this.commit(swapTiles(this.state(), targeting.first, id));
    }
  }

  cancelTargeting(): void {
    this.targeting.set(null);
  }

  private recordBest(): void {
    const key = this.bestKey();
    const score = this.score();
    if (key && score > (this.bestScores()[key] ?? 0)) {
      this.bestScores.update((best) => ({ ...best, [key]: score }));
    }
  }

  private recordPuzzle(): void {
    const { mode, won, levelId, moves } = this.state();
    if (mode !== 'puzzle' || !won || !levelId) return;
    const previous = this.puzzleProgress()[levelId];
    if (previous === undefined || moves < previous) {
      this.puzzleProgress.update((p) => ({ ...p, [levelId]: moves }));
    }
  }

  private commit(next: GameState): void {
    const current = this.state();
    if (next === current) return;
    this.history.update((h) => [...h, current].slice(-HISTORY_LIMIT));
    this.state.set(next);
  }

  private showGhosts(tiles: readonly Tile[]): void {
    this.ghosts.set(tiles);
    clearTimeout(this.ghostTimer);
    const linger = tiles.some((t) => t.exploding) ? BLAST_MS : SLIDE_MS;
    this.ghostTimer = setTimeout(() => this.ghosts.set([]), linger);
  }
}
