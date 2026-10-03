import { Injectable } from '@angular/core';
import { GameState } from '../engine';

const STATE_KEY = 'g2048.state';
const BEST_KEY = 'g2048.best';

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  loadState(): GameState | null {
    const raw = this.read(STATE_KEY);
    if (!raw) return null;
    try {
      const state = JSON.parse(raw) as GameState;
      return Array.isArray(state.tiles) && typeof state.size === 'number' ? state : null;
    } catch {
      return null;
    }
  }

  saveState(state: GameState): void {
    this.write(STATE_KEY, JSON.stringify(state));
  }

  loadBest(): number {
    return Number(this.read(BEST_KEY)) || 0;
  }

  saveBest(best: number): void {
    this.write(BEST_KEY, String(best));
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
