import { Injectable } from '@angular/core';
import { DEFAULT_LAYOUT_ID, GameState, getLayout, INITIAL_POWERS } from '../engine';

const STATE_KEY = 'g2048.state';
const BEST_KEY = 'g2048.best';
const PREFS_KEY = 'g2048.prefs';

export type BestScores = Readonly<Record<string, number>>;

export interface Preferences {
  readonly specials: boolean;
}

const DEFAULT_PREFS: Preferences = { specials: false };

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  loadState(): GameState | null {
    const raw = this.read(STATE_KEY);
    if (!raw) return null;
    try {
      const state = JSON.parse(raw) as Partial<GameState>;
      if (!Array.isArray(state.tiles) || typeof state.size !== 'number') return null;
      // Saves from before layouts existed are classic 4×4 games.
      const layout = getLayout(state.layoutId ?? DEFAULT_LAYOUT_ID);
      return {
        layoutId: layout.id,
        blocked: layout.blocked,
        target: layout.target,
        specials: false,
        powers: INITIAL_POWERS,
        ...state,
      } as GameState;
    } catch {
      return null;
    }
  }

  saveState(state: GameState): void {
    this.write(STATE_KEY, JSON.stringify(state));
  }

  loadBest(): BestScores {
    const raw = this.read(BEST_KEY);
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'number') return { [DEFAULT_LAYOUT_ID]: parsed };
      return parsed && typeof parsed === 'object' ? (parsed as BestScores) : {};
    } catch {
      return {};
    }
  }

  saveBest(best: BestScores): void {
    this.write(BEST_KEY, JSON.stringify(best));
  }

  loadPrefs(): Preferences {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(this.read(PREFS_KEY) ?? '{}') };
    } catch {
      return DEFAULT_PREFS;
    }
  }

  savePrefs(prefs: Preferences): void {
    this.write(PREFS_KEY, JSON.stringify(prefs));
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  }
}
