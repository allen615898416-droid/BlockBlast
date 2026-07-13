// Block Blast - 常量定义

export const GRID_SIZE = 8;
export const CELL_SIZE = 75;
export const CELL_GAP = 3;
export const TRAY_COUNT = 3;
export const TRAY_CELL_SIZE = 36;

// 方块配色 (R, G, B)
export const SHAPE_COLORS: [number, number, number][] = [
    [255, 107, 107],   // 0: 珊瑚红
    [78, 205, 196],    // 1: 青绿
    [255, 217, 61],    // 2: 明黄
    [107, 203, 119],   // 3: 草绿
    [77, 150, 255],    // 4: 天蓝
    [255, 143, 171],   // 5: 粉红
    [199, 125, 255],   // 6: 紫色
    [255, 179, 71],    // 7: 橙色
];

// 背景配色
export const BG_COLOR: [number, number, number] = [22, 18, 43];
export const GRID_BG_COLOR: [number, number, number] = [33, 28, 62];
export const EMPTY_CELL_COLOR: [number, number, number] = [45, 38, 80];

// 计分
export const SCORE_PER_CELL = 1;
export const SCORE_PER_LINE = 10;
