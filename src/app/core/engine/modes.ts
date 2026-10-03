import { createGame } from './game';
import { getLayout } from './layouts';
import { GameState, ModeId, Powers, Tile } from './types';

export const TIME_LIMIT_MS = 120_000;
export const DAILY_LAYOUT_ID = 'classic-4';
export const PUZZLE_POWERS: Powers = { undo: 3, shuffle: 0, remove: 0, swap: 0 };

export interface ModeInfo {
  readonly id: ModeId;
  readonly name: string;
  readonly description: string;
}

export const MODES: readonly ModeInfo[] = [
  { id: 'classic', name: 'Clássico', description: 'Junte as peças até chegar à meta do tabuleiro.' },
  { id: 'timed', name: 'Contra o tempo', description: '2 minutos para fazer o máximo de pontos.' },
  { id: 'daily', name: 'Desafio diário', description: 'Mesmo jogo para todos, renovado a cada dia.' },
  { id: 'puzzle', name: 'Puzzle', description: 'Alcance a peça-meta em poucos movimentos.' },
  { id: 'zen', name: 'Zen', description: 'Sem fim de jogo: as menores peças somem quando trava.' },
];

export function getMode(id: ModeId): ModeInfo {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

/** Local date as YYYY-MM-DD. */
export function todayKey(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** FNV-1a hash of the date, so every player gets the same daily game. */
export function dailySeed(date: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < date.length; i++) {
    hash ^= date.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

export interface PuzzleLevel {
  readonly id: string;
  readonly name: string;
  readonly hint: string;
  readonly layoutId: string;
  /**
   * One string per row, space separated: `.` empty, `#` blocked, `16` number,
   * `16*` frozen number, `S` stone, `M` multiplier, `B3` bomb with fuse 3.
   */
  readonly grid: readonly string[];
  readonly goal: number;
  readonly moveLimit: number;
  readonly seed: number;
}

export const PUZZLES: readonly PuzzleLevel[] = [
  {
    id: 'p1',
    name: 'Aquecimento',
    hint: 'Junte tudo numa linha.',
    layoutId: 'classic-4',
    grid: ['4 4 4 4', '. . . .', '. . . .', '. . . .'],
    goal: 16,
    moveLimit: 3,
    seed: 11,
  },
  {
    id: 'p2',
    name: 'Escada',
    hint: 'Comece pela peça menor.',
    layoutId: 'classic-4',
    grid: ['32 16 8 4', '. . . 4', '. . . .', '. . . .'],
    goal: 64,
    moveLimit: 5,
    seed: 23,
  },
  {
    id: 'p3',
    name: 'Pedra no caminho',
    hint: 'Uma junção ao lado quebra a pedra.',
    layoutId: 'classic-4',
    grid: ['64 S 32 32', '. . . .', '. . . .', '. . . .'],
    goal: 128,
    moveLimit: 3,
    seed: 37,
  },
  {
    id: 'p4',
    name: 'Degelo',
    hint: 'O gelo derrete com o tempo.',
    layoutId: 'classic-4',
    grid: ['16* 16 . .', '. . . .', '32 . . .', '. . . .'],
    goal: 64,
    moveLimit: 5,
    seed: 41,
  },
  {
    id: 'p5',
    name: 'Dobradinha',
    hint: 'O multiplicador dobra quem encostar.',
    layoutId: 'classic-4',
    grid: ['64 . . .', '. . . .', '32 . . 32', '. . . M'],
    goal: 256,
    moveLimit: 4,
    seed: 53,
  },
  {
    id: 'p6',
    name: 'Encruzilhada',
    hint: 'Use os cantos bloqueados a seu favor.',
    layoutId: 'cross-5',
    grid: ['# 8 . . #', '. 64 . . .', '. . 32 . .', '. . . 16 .', '# 8 . . #'],
    goal: 128,
    moveLimit: 7,
    seed: 67,
  },
  {
    id: 'p7',
    name: 'Ampulheta',
    hint: 'Tudo precisa passar pelo meio.',
    layoutId: 'hourglass-5',
    grid: ['32 . . . 32', '# . . . #', '# # . # #', '# . . . #', '. . 64 . .'],
    goal: 128,
    moveLimit: 7,
    seed: 79,
  },
  {
    id: 'p8',
    name: 'Contagem regressiva',
    hint: 'Deixe a bomba abrir espaço.',
    layoutId: 'classic-4',
    grid: ['8 4 2 64', '16 . 8 16', '64 . B2 .', '2 16 . 8'],
    goal: 128,
    moveLimit: 5,
    seed: 83,
  },
];

export function getPuzzle(id: string | undefined): PuzzleLevel | undefined {
  return PUZZLES.find((p) => p.id === id);
}

function parseToken(token: string, id: number, row: number, col: number): Tile | null {
  if (token === '.' || token === '#') return null;
  if (token === 'S') return { id, value: 0, row, col, kind: 'stone' };
  if (token === 'M') return { id, value: 0, row, col, kind: 'multiplier' };
  if (token.startsWith('B')) return { id, value: 0, row, col, kind: 'bomb', fuse: Number(token.slice(1)) };
  if (token.endsWith('*')) return { id, value: Number(token.slice(0, -1)), row, col, frozen: 2 };
  return { id, value: Number(token), row, col };
}

export function createPuzzle(level: PuzzleLevel): GameState {
  const layout = getLayout(level.layoutId);
  const tiles: Tile[] = [];
  level.grid.forEach((line, row) =>
    line.split(/\s+/).forEach((token, col) => {
      const tile = parseToken(token, tiles.length + 1, row, col);
      if (tile) tiles.push(tile);
    }),
  );
  const base = createGame(layout, level.seed, { specials: false, mode: 'puzzle', powers: PUZZLE_POWERS });
  return {
    ...base,
    tiles,
    target: level.goal,
    nextId: tiles.length + 1,
    rngState: level.seed,
    moveLimit: level.moveLimit,
    levelId: level.id,
  };
}

export interface StartConfig {
  readonly mode: ModeId;
  readonly layoutId: string;
  readonly specials: boolean;
  readonly levelId?: string;
  readonly date?: string;
}

/** Builds a fresh game for any mode. `seed` is ignored where the mode fixes it. */
export function createModeGame(config: StartConfig, seed: number): GameState {
  switch (config.mode) {
    case 'puzzle':
      return createPuzzle(getPuzzle(config.levelId) ?? PUZZLES[0]);
    case 'daily': {
      const date = config.date ?? todayKey();
      return {
        ...createGame(getLayout(DAILY_LAYOUT_ID), dailySeed(date), { specials: true, mode: 'daily' }),
        date,
      };
    }
    case 'timed':
      return {
        ...createGame(getLayout(config.layoutId), seed, { specials: config.specials, mode: 'timed' }),
        timeLeft: TIME_LIMIT_MS,
      };
    default:
      return createGame(getLayout(config.layoutId), seed, { specials: config.specials, mode: config.mode });
  }
}
