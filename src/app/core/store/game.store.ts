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
  randomSeed,
  Tile,
} from '../engine';
import { PersistenceService } from './persistence.service';

export const SLIDE_MS = 110;
const BLAST_MS = 450;

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
  private readonly ghosts = signal<readonly Tile[]>([]);
  private ghostTimer?: ReturnType<typeof setTimeout>;

  readonly layouts = LAYOUTS;
  readonly bestByLayout = signal(this.persistence.loadBest());
  readonly lastGain = signal<{ value: number; key: number } | null>(null);

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
  readonly locked = computed(() => this.over() || this.showWin());
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

    this.state.set(result.state);
    this.ghosts.set([...result.consumed, ...result.destroyed]);
    clearTimeout(this.ghostTimer);
    const linger = result.destroyed.length > 0 ? BLAST_MS : SLIDE_MS;
    this.ghostTimer = setTimeout(() => this.ghosts.set([]), linger);

    if (result.gained > 0) this.lastGain.set({ value: result.gained, key: result.state.moves });
    if (result.state.score > this.best()) {
      const key = this.bestKey();
      this.bestByLayout.update((best) => ({ ...best, [key]: result.state.score }));
    }
  }

  newGame(layoutId = this.state().layoutId): void {
    clearTimeout(this.ghostTimer);
    this.ghosts.set([]);
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
}
