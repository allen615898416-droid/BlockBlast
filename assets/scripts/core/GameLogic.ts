// Block Blast - 游戏逻辑控制

import { Grid } from './Grid';
import { getInitialTrayShapes, getTrayShapes, getTrayShapesWithDDA, DDAMultipliers } from './Shapes';
import {
    CLEAR_BASE_SCORE_PER_CELL,
    CLEAR_EXTRA_LINE_BONUS_PER_CELL,
    SCORE_PER_PLACED_CELL,
    TRAY_COUNT,
} from './Constants';
import { PlacementResult, Shape } from './Types';

export class GameLogic {
    public grid: Grid;
    public tray: (Shape | null)[];
    public score: number;
    public bestScore: number;
    public isGameOver: boolean;

    // DDA 状态
    private turnCount: number = 0;
    private lastClearTurn: number = 0;
    private consecutiveClears: number = 0;
    private rescueCount: number = 0;  // 单局保底触发次数，最多3次

    constructor() {
        this.grid = new Grid();
        this.score = 0;
        this.bestScore = 0;
        this.isGameOver = false;
        this.tray = [];
        this.tray = getInitialTrayShapes(TRAY_COUNT);
    }

    public placeShape(trayIndex: number, row: number, col: number): PlacementResult {
        const fail: PlacementResult = {
            success: false,
            linesCleared: 0,
            scoreGained: 0,
            gameOver: false,
            placedCells: [],
            clearedCells: [],
            clearedRows: [],
            clearedCols: [],
        };

        if (this.isGameOver || trayIndex < 0 || trayIndex >= this.tray.length) return fail;

        const shape = this.tray[trayIndex];
        if (!shape || !this.grid.canPlace(shape, row, col)) return fail;

        const placedCells = this.grid.getShapeCells(shape, row, col);

        // 放置得分：每个组成形状的 cell 计 1 分。
        this.grid.place(shape, row, col);
        let scoreGained = shape.cells.length * SCORE_PER_PLACED_CELL;

        // 消除得分：按实际清除的 cell 数计算；同次多消行/列会提高每个 cell 的分值。
        const { rows, cols } = this.grid.checkLines();
        const totalLines = rows.length + cols.length;
        const clearedCells = this.grid.getLineCells(rows, cols);

        if (totalLines > 0) {
            this.grid.clearLines(rows, cols);
            const scorePerClearedCell = CLEAR_BASE_SCORE_PER_CELL
                + (totalLines - 1) * CLEAR_EXTRA_LINE_BONUS_PER_CELL;
            // Combo 加成：连续第N次消行，分数倍率递增
            const comboMult = this.consecutiveClears >= 4 ? 3.0
                : this.consecutiveClears >= 3 ? 2.0
                : this.consecutiveClears >= 2 ? 1.5
                : 1.0;
            const clearScore = Math.round(clearedCells.length * scorePerClearedCell * comboMult);
            scoreGained += clearScore;
        }

        this.score += scoreGained;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }

        // DDA 状态更新
        this.turnCount++;
        if (totalLines > 0) {
            this.consecutiveClears++;
            this.lastClearTurn = this.turnCount;
        } else {
            this.consecutiveClears = 0;
        }

        // 从托盘中移除
        this.tray[trayIndex] = null;

        // 托盘空了 → 补充
        if (this.tray.every(s => s === null)) {
            this.refillTray();
        }

        // 无尽模式：没有过关目标，只在所有候选块都无法放置时结束。
        const gameOver = this.checkGameOver();

        return { success: true, linesCleared: totalLines, scoreGained, gameOver, placedCells, clearedCells, clearedRows: rows, clearedCols: cols };
    }

    public refillTray(): void {
        const m = this.computeDDA();
        const fillRate = this.grid.getFillRate();
        // 只在棋盘极度拥挤（填充率>80%）且本局保底未用完时才触发
        if (fillRate > 0.8 && this.rescueCount < 3) {
            // 第一优先：至少1块能消除（3次重试）
            for (let attempt = 0; attempt < 3; attempt++) {
                this.tray = getTrayShapesWithDDA(TRAY_COUNT, m);
                if (this.tray.some(s => s && this.grid.canClearAnywhere(s))) {
                    this.rescueCount++;
                    return;
                }
            }
            // 兜底：至少1块能放（3次重试）
            for (let attempt = 0; attempt < 3; attempt++) {
                this.tray = getTrayShapesWithDDA(TRAY_COUNT, m);
                if (this.tray.some(s => s && this.grid.canPlaceAnywhere(s))) {
                    this.rescueCount++;
                    return;
                }
            }
        }
        // 正常情况或保底用完：直接出块
        this.tray = getTrayShapesWithDDA(TRAY_COUNT, m);
    }

    /** 根据棋盘填充率计算 DDA 倍率 */
    private computeDDA(): DDAMultipliers {
        const fillRate = this.grid.getFillRate();

        // 基础倍率
        let small = 1.0;   // 1/3格
        let medium = 1.0;  // 4/5格
        let large = 1.0;   // 6/7/9格
        let line = 1.0;    // 直线块

        // 棋盘拥挤度感知
        if (fillRate > 0.7) {
            // 拥挤：小块加权，大块降权
            small *= 1.6;
            large *= 0.4;
        } else if (fillRate < 0.3) {
            // 空旷：大块加权，小块降权
            large *= 1.5;
            small *= 0.6;
        }

        return { small, medium, large, line };
    }

    public checkGameOver(): boolean {
        for (const shape of this.tray) {
            if (shape && this.grid.canPlaceAnywhere(shape)) {
                this.isGameOver = false;
                return false;
            }
        }
        this.isGameOver = true;
        return true;
    }

    public restart(): void {
        this.grid.clear();
        this.score = 0;
        this.isGameOver = false;
        this.turnCount = 0;
        this.lastClearTurn = 0;
        this.consecutiveClears = 0;
        this.rescueCount = 0;
        this.refillTray();
    }
}
