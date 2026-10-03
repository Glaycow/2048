export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Tile {
  readonly id: number;
  readonly value: number;
  readonly row: number;
  readonly col: number;
  readonly isNew?: boolean;
  readonly merged?: boolean;
}

export interface GameState {
  readonly size: number;
  readonly tiles: readonly Tile[];
  readonly score: number;
  readonly moves: number;
  readonly won: boolean;
  readonly over: boolean;
  readonly keepPlaying: boolean;
  readonly nextId: number;
  readonly rngState: number;
}

export interface MoveResult {
  readonly state: GameState;
  readonly moved: boolean;
  readonly gained: number;
  /** Tiles absorbed by a merge, positioned at the merge cell (for animation). */
  readonly consumed: readonly Tile[];
}

export const WIN_VALUE = 2048;
