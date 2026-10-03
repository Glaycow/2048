import { BoardLayout } from './types';

type CellTest = (row: number, col: number, size: number) => boolean;

function cellsWhere(size: number, test: CellTest): number[] {
  const cells: number[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (test(row, col, size)) cells.push(row * size + col);
    }
  }
  return cells;
}

const classic = (size: number, target: number): BoardLayout => ({
  id: `classic-${size}`,
  name: `Clássico ${size}×${size}`,
  size,
  blocked: [],
  target,
});

const isCorner: CellTest = (row, col, size) => {
  const edge = (n: number) => n === 0 || n === size - 1;
  return edge(row) && edge(col);
};

export const LAYOUTS: readonly BoardLayout[] = [
  classic(3, 256),
  classic(4, 2048),
  classic(5, 4096),
  classic(6, 8192),
  classic(8, 16384),
  {
    id: 'cross-5',
    name: 'Cruz',
    size: 5,
    blocked: cellsWhere(5, isCorner),
    target: 2048,
  },
  {
    id: 'diamond-7',
    name: 'Losango',
    size: 7,
    blocked: cellsWhere(7, (r, c) => Math.abs(r - 3) + Math.abs(c - 3) > 3),
    target: 2048,
  },
  {
    id: 'ring-6',
    name: 'Anel',
    size: 6,
    blocked: cellsWhere(6, (r, c) => (r === 2 || r === 3) && (c === 2 || c === 3)),
    target: 4096,
  },
  {
    id: 'pillars-6',
    name: 'Pilares',
    size: 6,
    blocked: [1 * 6 + 1, 1 * 6 + 4, 4 * 6 + 1, 4 * 6 + 4],
    target: 4096,
  },
  {
    id: 'hourglass-5',
    name: 'Ampulheta',
    size: 5,
    blocked: cellsWhere(5, (r, c) => (r === 1 || r === 3) && (c === 0 || c === 4) || (r === 2 && c !== 2)),
    target: 1024,
  },
];

export const DEFAULT_LAYOUT_ID = 'classic-4';

export function getLayout(id: string): BoardLayout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS.find((l) => l.id === DEFAULT_LAYOUT_ID)!;
}
