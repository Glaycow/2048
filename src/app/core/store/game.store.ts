import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import {
  continueAfterWin,
  createGame,
  DEFAULT_LAYOUT_ID,
  Direction,
  GameState,
  getLayout,
  LAYOUTS,
  move,
  PowerId,
  randomSeed,
  removeTile,
  shuffleTiles,
  swapTiles,
  Tile,
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

export function bestKey(layoutId: string, specials: boolean): string {
  return specials ? `${layoutId}+especiais` : layoutId;
}

@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly persistence = inject(PersistenceService);

  readonly prefs = signal(this.persistence.loadPrefs());

  private readonly state = signal<GameState>(
    this.persistence.loadState() ??
      createGame(getLayout(DEFAULT_LAYOUT_ID), randomSeed(), { specials: this.prefs().specials }),
  );
  private readonly history = signal<readonly GameState[]>([]);
  private readonly ghosts = signal<readonly Tile[]>([]);
  private ghostTimer?: ReturnType<typeof setTimeout>;

  readonly layouts = LAYOUTS;
  readonly bestByLayout = signal(this.persistence.loadBest());
  readonly lastGain = signal<{ value: number; key: number } | null>(null);
  readonly targeting = signal<Targeting | null>(null);

  readonly layout = computed(() => getLayout(this.state().layoutId));
  readonly size = computed(() => this.state().size);
  readonly blocked = computed(() => new Set(this.state().blocked));
  readonly target = computed(() => this.state().target);
  readonly score = computed(() => this.state().score);
  readonly specials = computed(() => this.state().specials);
  readonly bestKey = computed(() => bestKey(this.state().layoutId, this.state().specials));
  readonly best = computed(() => this.bestByLayout()[this.bestKey()] ?? 0);
  readonly moves = computed(() => this.state().moves);
  readonly over = computed(() => this.state().over);
  readonly showWin = computed(() => this.state().won && !this.state().keepPlaying);
  readonly locked = computed(() => this.over() || this.showWin() || this.targeting() !== null);
  readonly showOver = computed(() => this.over() && this.targeting() === null);
  readonly powers = computed(() => this.state().powers);
  /** Whether each power can be used right now. */
  readonly available = computed(() => {
    const powers = this.powers();
    const busy = this.showWin();
    const tiles = this.state().tiles.length;
    return {
      undo: !busy && powers.undo > 0 && this.history().length > 0,
      shuffle: !busy && powers.shuffle > 0 && tiles > 1,
      remove: !busy && powers.remove > 0 && tiles > 0,
      swap: !busy && powers.swap > 0 && tiles > 1,
    } satisfies Record<PowerId, boolean>;
  });
  readonly maxTile = computed(() => Math.max(0, ...this.state().tiles.map((t) => t.value)));
  /** Ghosts first so live tiles render above them. */
  readonly tiles = computed(() => [...this.ghosts(), ...this.state().tiles]);
  readonly ghostIds = computed(() => new Set(this.ghosts().map((t) => t.id)));

  constructor() {
    effect(() => this.persistence.saveState(this.state()));
    effect(() => this.persistence.saveBest(this.bestByLayout()));
    effect(() => this.persistence.savePrefs(this.prefs()));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.ghostTimer));
  }

  move(direction: Direction): void {
    if (this.locked()) return;
    const result = move(this.state(), direction);
    if (!result.moved) return;

    this.commit(result.state);
    this.showGhosts([...result.consumed, ...result.destroyed]);

    if (result.gained > 0) this.lastGain.set({ value: result.gained, key: result.state.moves });
    if (result.state.score > this.best()) {
      const key = this.bestKey();
      this.bestByLayout.update((best) => ({ ...best, [key]: result.state.score }));
    }
  }

  newGame(layoutId = this.state().layoutId): void {
    clearTimeout(this.ghostTimer);
    this.ghosts.set([]);
    this.history.set([]);
    this.targeting.set(null);
    this.lastGain.set(null);
    this.state.set(createGame(getLayout(layoutId), randomSeed(), { specials: this.prefs().specials }));
  }

  setSpecials(specials: boolean): void {
    this.prefs.update((prefs) => ({ ...prefs, specials }));
    this.newGame();
  }

  keepPlaying(): void {
    this.state.update(continueAfterWin);
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
