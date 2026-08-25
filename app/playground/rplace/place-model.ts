export const BOARD_SIZE = 100;
export const BOARD_CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const EMPTY_COLOR_INDEX = 29;
export const STORAGE_KEY = "local-place-prototype:v1";
export const COOLDOWN_MS = 5_000;

export type Point = { x: number; y: number };
export type Cell = { x: number; y: number };
export type ViewTransform = { scale: number; tx: number; ty: number };

export type PaletteColor = {
  name: string;
  hex: string;
  darkText?: boolean;
};

export const PALETTE: PaletteColor[] = [
  { name: "Orange red", hex: "#ff4500" },
  { name: "Orange", hex: "#ffa800", darkText: true },
  { name: "Yellow", hex: "#ffd635", darkText: true },
  { name: "Pale yellow", hex: "#fff8b8", darkText: true },
  { name: "Dark green", hex: "#00a368" },
  { name: "Green", hex: "#00cc78", darkText: true },
  { name: "Light green", hex: "#7eed56", darkText: true },
  { name: "Dark teal", hex: "#00756f" },
  { name: "Teal", hex: "#009eaa" },
  { name: "Light teal", hex: "#00ccc0", darkText: true },
  { name: "Dark blue", hex: "#2450a4" },
  { name: "Blue", hex: "#3690ea" },
  { name: "Light blue", hex: "#51e9f4", darkText: true },
  { name: "Indigo", hex: "#493ac1" },
  { name: "Periwinkle", hex: "#6a5cff" },
  { name: "Light periwinkle", hex: "#94b3ff", darkText: true },
  { name: "Dark purple", hex: "#811e9f" },
  { name: "Purple", hex: "#b44ac0" },
  { name: "Lavender", hex: "#e4abff", darkText: true },
  { name: "Dark pink", hex: "#de107f" },
  { name: "Pink", hex: "#ff3881" },
  { name: "Light pink", hex: "#ff99aa", darkText: true },
  { name: "Dark brown", hex: "#6d482f" },
  { name: "Brown", hex: "#9c6926" },
  { name: "Peach", hex: "#ffb470", darkText: true },
  { name: "Black", hex: "#000000" },
  { name: "Charcoal", hex: "#515252" },
  { name: "Gray", hex: "#898d90", darkText: true },
  { name: "Light gray", hex: "#d4d7d9", darkText: true },
  { name: "White", hex: "#ffffff", darkText: true },
];

const GLYPHS: Record<string, string[]> = {
  r: ["00000", "10110", "11001", "10000", "10000", "10000", "10000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  p: ["00000", "11110", "10001", "11110", "10000", "10000", "10000"],
  l: ["11000", "01000", "01000", "01000", "01000", "01000", "00110"],
  a: ["00000", "01110", "00001", "01111", "10001", "01111", "00000"],
  c: ["00000", "01111", "10000", "10000", "10000", "01111", "00000"],
  e: ["00000", "01110", "10001", "11111", "10000", "01111", "00000"],
};

function fillRect(
  board: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  colorIndex: number,
) {
  for (let row = Math.max(0, y); row < Math.min(BOARD_SIZE, y + height); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(BOARD_SIZE, x + width); column += 1) {
      board[row * BOARD_SIZE + column] = colorIndex;
    }
  }
}

function drawGlyph(
  board: Uint8Array,
  glyph: string[],
  x: number,
  y: number,
  scale: number,
  colorIndex: number,
) {
  glyph.forEach((row, rowIndex) => {
    [...row].forEach((pixel, columnIndex) => {
      if (pixel === "1") {
        fillRect(
          board,
          x + columnIndex * scale,
          y + rowIndex * scale,
          scale,
          scale,
          colorIndex,
        );
      }
    });
  });
}

export function createSeedBoard() {
  const board = new Uint8Array(BOARD_CELL_COUNT);
  board.fill(EMPTY_COLOR_INDEX);

  const word = "r/place";
  const wordColors = [0, 26, 0, 1, 19, 16, 11];
  [...word].forEach((letter, index) => {
    drawGlyph(board, GLYPHS[letter], 7 + index * 12, 20, 2, wordColors[index]);
  });

  const heart = [
    "0110110",
    "1111111",
    "1111111",
    "0111110",
    "0011100",
    "0001000",
  ];
  drawGlyph(board, heart, 74, 33, 2, 20);
  fillRect(board, 76, 35, 4, 4, 21);

  fillRect(board, 10, 55, 18, 18, 2);
  fillRect(board, 13, 59, 3, 3, 25);
  fillRect(board, 22, 59, 3, 3, 25);
  fillRect(board, 14, 67, 2, 2, 25);
  fillRect(board, 16, 69, 6, 2, 25);
  fillRect(board, 22, 67, 2, 2, 25);

  for (let step = 0; step < 8; step += 1) {
    fillRect(board, 43 + step * 2, 94 - step * 2, 2, 2, 15);
  }

  const rainbowColors = [0, 1, 2, 6, 11, 16, 19];
  rainbowColors.forEach((colorIndex, index) => {
    fillRect(board, 38 + index * 3, 48 + index, 3, 19 - index * 2, colorIndex);
  });

  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      fillRect(
        board,
        72 + column * 2,
        78 + row * 2,
        2,
        2,
        (row + column) % 2 === 0 ? 25 : 29,
      );
    }
  }

  const scattered: Array<[number, number, number, number]> = [
    [22, 43, 6, 0],
    [82, 25, 5, 16],
    [77, 36, 5, 11],
    [53, 65, 5, 20],
    [41, 74, 5, 0],
    [60, 82, 5, 0],
    [4, 62, 4, 4],
    [91, 51, 3, 17],
    [68, 58, 3, 1],
    [33, 37, 3, 9],
  ];
  scattered.forEach(([x, y, size, colorIndex]) => fillRect(board, x, y, size, size, colorIndex));

  return board;
}

export function screenToWorld(point: Point, view: ViewTransform): Point {
  return {
    x: (point.x - view.tx) / view.scale,
    y: (point.y - view.ty) / view.scale,
  };
}

export function worldToScreen(point: Point, view: ViewTransform): Point {
  return {
    x: point.x * view.scale + view.tx,
    y: point.y * view.scale + view.ty,
  };
}

export function pointToCell(point: Point, view: ViewTransform): Cell | null {
  const world = screenToWorld(point, view);
  const x = Math.floor(world.x);
  const y = Math.floor(world.y);
  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return null;
  return { x, y };
}

export function cellIndex(cell: Cell) {
  return cell.y * BOARD_SIZE + cell.x;
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function sameCell(left: Cell | null, right: Cell | null) {
  return Boolean(left && right && left.x === right.x && left.y === right.y);
}

export function formatCooldown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
