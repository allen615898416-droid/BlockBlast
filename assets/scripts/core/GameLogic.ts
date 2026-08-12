// Block Blast - 游戏逻辑控制

import { Grid } from './Grid';
import { getTrayShapes } from './Shapes';
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

    constructor() {
        this.grid = new Grid();
        this.score = 0;
        this.bestScore = 0;
        this.isGameOver = false;
        this.tray = [];
        this.refillTray();
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
            const clearScore = Math.round(clearedCells.length * scorePerClearedCell);
            scoreGained += clearScore;
        }

        this.score += scoreGained;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }

        // 从托盘中移除
        this.tray[trayIndex] = null;

        // 托盘空了 → 补充
        if (this.tray.every(s => s === null)) {
            this.refillTray();
        }

        // 无尽模式只检查游戏结束，不再按目标分结算关卡。
        const gameOver = this.checkGameOver();

        return { success: true, linesCleared: totalLines, scoreGained, gameOver, placedCells, clearedCells, clearedRows: rows, clearedCols: cols };
    }

    public refillTray(): void {
        this.tray = getTrayShapes(TRAY_COUNT);
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
        // 无尽模式重开一局，分数清零，最高分保留。
        this.grid.clear();
        this.score = 0;
        this.isGameOver = false;
        this.refillTray();
    }
}
