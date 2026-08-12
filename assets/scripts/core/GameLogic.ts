// Block Blast - 游戏逻辑控制

import { Grid } from './Grid';
import { getTrayShapes } from './Shapes';
import {
    CLEAR_BASE_SCORE_PER_CELL,
    CLEAR_EXTRA_LINE_BONUS_PER_CELL,
    LEVEL_TARGETS,
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
    public level: number;
    public isLevelComplete: boolean;

    constructor(startLevel: number = 1) {
        this.grid = new Grid();
        this.score = 0;
        this.bestScore = 0;
        this.isGameOver = false;
        this.level = (startLevel >= 1 && startLevel <= LEVEL_TARGETS.length) ? startLevel : 1;
        this.isLevelComplete = false;
        this.tray = [];
        this.refillTray();
    }

    get targetScore(): number {
        return LEVEL_TARGETS[Math.min(this.level - 1, LEVEL_TARGETS.length - 1)];
    }

    public placeShape(trayIndex: number, row: number, col: number): PlacementResult {
        const fail: PlacementResult = {
            success: false,
            linesCleared: 0,
            scoreGained: 0,
            gameOver: false,
            levelComplete: false,
            placedCells: [],
            clearedCells: [],
            clearedRows: [],
            clearedCols: [],
        };

        if (this.isGameOver || this.isLevelComplete || trayIndex < 0 || trayIndex >= this.tray.length) return fail;

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

        // 关卡完成检查（优先于游戏结束判定，过关即结束本关）
        if (this.score >= this.targetScore) {
            this.isLevelComplete = true;
            return { success: true, linesCleared: totalLines, scoreGained, gameOver: false, levelComplete: true, placedCells, clearedCells, clearedRows: rows, clearedCols: cols };
        }

        // 检查游戏结束
        const gameOver = this.checkGameOver();

        return { success: true, linesCleared: totalLines, scoreGained, gameOver, levelComplete: false, placedCells, clearedCells, clearedRows: rows, clearedCols: cols };
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

    public nextLevel(): void {
        // 通关最后一关后保持在最后一关继续挑战（目标分不变，可反复游玩）
        if (this.level < LEVEL_TARGETS.length) {
            this.level++;
        }
        this.grid.clear();
        this.score = 0;
        this.isGameOver = false;
        this.isLevelComplete = false;
        this.refillTray();
    }

    public restart(): void {
        // 重玩本关（保留关卡进度，不回第1关）
        this.grid.clear();
        this.score = 0;
        this.isGameOver = false;
        this.isLevelComplete = false;
        this.refillTray();
    }
}
