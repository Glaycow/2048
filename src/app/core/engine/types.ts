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
  /** Removed by an explosion, a power or a broken stone (animation only). */
  readonly exploding?: boolean;
}

export type PowerId = 'undo' | 'shuffle' | 'remove' | 'swap';
export type Powers = Readonly<Record<PowerId, number>>;

export interface BoardLayout {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  /** Cell indices (row * size + col) that tiles cannot occupy or cross. */
  readonly blocked: readonly number[];
  readonly target: number;
}

export type ModeId = 'classic' | 'timed' | 'daily' | 'puzzle' | 'zen';
export type EndReason = 'stuck' | 'time' | 'moves';

export interface GameOptions {
  readonly specials: boolean;
  readonly mode?: ModeId;
  readonly powers?: Powers;
}

export interface SpawnInfo {
  readonly row: number;
  readonly col: number;
  readonly value: number;
}

export interface GameState {
  readonly mode: ModeId;
  readonly layoutId: string;
  readonly size: number;
  readonly blocked: readonly number[];
  readonly target: number;
  readonly specials: boolean;
  readonly powers: Powers;
  readonly tiles: readonly Tile[];
  readonly score: number;
  readonly moves: number;
  readonly won: boolean;
  readonly over: boolean;
  readonly keepPlaying: boolean;
  readonly nextId: number;
  readonly rngState: number;
  readonly endReason?: EndReason;
  /** Timed mode: milliseconds left. */
  readonly timeLeft?: number;
  /** Puzzle mode: moves allowed. */
  readonly moveLimit?: number;
  readonly levelId?: string;
  /** Daily mode: YYYY-MM-DD of the challenge. */
  readonly date?: string;
  /** Cell and value of the most recent spawn. */
  readonly lastSpawn?: SpawnInfo;
  /** Set by undo: the next spawn must not repeat this cell or value. */
  readonly avoidSpawn?: SpawnInfo;
}

export interface MoveResult {
  readonly state: GameState;
  readonly moved: boolean;
  readonly gained: number;
  /** Tiles absorbed by a merge, positioned at the merge cell (for animation). */
  readonly consumed: readonly Tile[];
  /** Tiles destroyed by bombs, broken stones or zen relief (for animation). */
  readonly destroyed: readonly Tile[];
}
