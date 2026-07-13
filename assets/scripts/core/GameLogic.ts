// Block Blast - 游戏逻辑控制

import { Grid } from './Grid';
import { getTrayShapes } from './Shapes';
import { TRAY_COUNT, SCORE_PER_CELL, SCORE_PER_LINE } from './Constants';
import { Shape, PlacementResult } from './Types';

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
        const fail: PlacementResult = { success: false, linesCleared: 0, scoreGained: 0, gameOver: false };

        if (this.isGameOver || trayIndex < 0 || trayIndex >= this.tray.length) return fail;

        const shape = this.tray[trayIndex];
        if (!shape || !this.grid.canPlace(shape, row, col)) return fail;

        // 放置方块
        this.grid.place(shape, row, col);
        let scoreGained = shape.cells.length * SCORE_PER_CELL;

        // 检查并消除满行/满列
        const { rows, cols } = this.grid.checkLines();
        const totalLines = rows.length + cols.length;

        if (totalLines > 0) {
            this.grid.clearLines(rows, cols);
            // 连消倍率：行数越多分越高
            const lineScore = totalLines * SCORE_PER_LINE * totalLines;
            scoreGained += lineScore;
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

        // 检查游戏结束
        const gameOver = this.checkGameOver();

        return { success: true, linesCleared: totalLines, scoreGained, gameOver };
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
        this.grid.clear();
        this.score = 0;
        this.isGameOver = false;
        this.refillTray();
    }
}
