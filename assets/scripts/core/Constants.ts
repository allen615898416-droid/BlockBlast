// Block Blast - Constants

export const GRID_COLS = 8;
export const GRID_ROWS = 12;
export const CELL_SIZE = 43;
export const CELL_GAP = 1;
export const TRAY_COUNT = 3;
export const TRAY_CELL_SIZE = 22;

// Block colors (R, G, B): red, blue, green, purple, yellow, orange, cyanexport const SHAPE_COLORS: [number, number, number][] = [
    [230, 62, 68],      // 0: red
    [48, 92, 225],      // 1: blue
    [116, 202, 72],     // 2: green
    [129, 82, 213],     // 3: purple
    [241, 192, 45],     // 4: yellow
    [255, 140, 40],     // 5: orange
    [0, 200, 200],      // 6: cyan
];

// Background colors
export const BG_COLOR: [number, number, number] = [66, 92, 160];
export const GRID_BG_COLOR: [number, number, number] = [36, 47, 95];
export const EMPTY_CELL_COLOR: [number, number, number] = [38, 49, 95];

// Scoring: 1 point per cell placed; clears scored by actual cleared cell count.
// Each additional line cleared in the same move adds 0.875 bonus per cell.
export const SCORE_PER_PLACED_CELL = 1;
export const CLEAR_BASE_SCORE_PER_CELL = 7.125;
export const CLEAR_EXTRA_LINE_BONUS_PER_CELL = 0.875;
