// Block Blast - 常量定义

export const GRID_COLS = 8;
export const GRID_ROWS = 12;
export const CELL_SIZE = 43;
export const CELL_GAP = 1;
export const TRAY_COUNT = 3;
export const TRAY_CELL_SIZE = 22;

// 方块配色 (R, G, B)：使用 UI_v4.0/block 的红、蓝、绿、紫、黄五个 cell
export const SHAPE_COLORS: [number, number, number][] = [
    [230, 62, 68],      // 0: 红色
    [48, 92, 225],      // 1: 蓝色
    [116, 202, 72],     // 2: 绿色
    [129, 82, 213],     // 3: 紫色
    [241, 192, 45],     // 4: 黄色
];

// 背景配色
export const BG_COLOR: [number, number, number] = [66, 92, 160];
export const GRID_BG_COLOR: [number, number, number] = [36, 47, 95];
export const EMPTY_CELL_COLOR: [number, number, number] = [38, 49, 95];

// 计分：每放置 1 个 cell 得 1 分；消除按实际清除 cell 数计分。
// 同次消除每多 1 条完整行/列，每个被清除 cell 额外增加 0.875 分。
export const SCORE_PER_PLACED_CELL = 1;
export const CLEAR_BASE_SCORE_PER_CELL = 7.125;
export const CLEAR_EXTRA_LINE_BONUS_PER_CELL = 0.875;

// 关卡目标分（每关独立计分，达标即过关，分数清零进下一关）
export const LEVEL_TARGETS: number[] = [100, 150, 210, 280, 360, 450, 550, 660, 780, 920];
