export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

/** `number` is a regular tile; the others only appear with special tiles enabled. */
export type TileKind = 'number' | 'bomb' | 'multiplier' | 'stone';

export interface Tile {
  readonly id: number;
  /** 0 for non-number kinds. */
  readonly value: number;
  readonly row: number;
  readonly col: number;
  readonly kind?: TileKind;
  /** Bomb: moves left before it explodes. */
  readonly fuse?: number;
  /** Ice: moves left while frozen in place. */
  readonly frozen?: number;
  readonly isNew?: boolean;
  readonly merged?: boolean;
  /** Removed by an explosion or broken stone (animation only). */
  readonly exploding?: boolean;
}

export interface BoardLayout {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  /** Cell indices (row * size + col) that tiles cannot occupy or cross. */
  readonly blocked: readonly number[];
  readonly target: number;
}

export interface GameOptions {
  readonly specials: boolean;
}

export interface GameState {
  readonly layoutId: string;
  readonly size: number;
  readonly blocked: readonly number[];
  readonly target: number;
  readonly specials: boolean;
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
  /** Tiles destroyed by bombs or broken stones (for animation). */
  readonly destroyed: readonly Tile[];
}
