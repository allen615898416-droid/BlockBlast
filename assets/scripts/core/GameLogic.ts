// Block Blast - Game Logic Controller

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

    // DDA state
    private turnCount: number = 0;
    private lastClearTurn: number = 0;
    private consecutiveClears: number = 0;
    private rescueCount: number = 0;  // rescue triggers per game, max 3

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

        // Placement score: 1 point per cell in the shape.
        this.grid.place(shape, row, col);
        let scoreGained = shape.cells.length * SCORE_PER_PLACED_CELL;

        // Clear score: based on actual cleared cell count; multi-line clears increase per-cell value.
        const { rows, cols } = this.grid.checkLines();
        const totalLines = rows.length + cols.length;
        const clearedCells = this.grid.getLineCells(rows, cols);

        if (totalLines > 0) {
            this.grid.clearLines(rows, cols);
            const scorePerClearedCell = CLEAR_BASE_SCORE_PER_CELL
                + (totalLines - 1) * CLEAR_EXTRA_LINE_BONUS_PER_CELL;
            // Combo bonus: consecutive clears increase score multiplier
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

        // DDA state update
        this.turnCount++;
        if (totalLines > 0) {
            this.consecutiveClears++;
            this.lastClearTurn = this.turnCount;
        } else {
            this.consecutiveClears = 0;
        }

        // Remove from tray
        this.tray[trayIndex] = null;

        // Tray empty → refill
        if (this.tray.every(s => s === null)) {
            this.refillTray();
        }

        // Endless mode: no level target; game over only when no candidate can be placed.
        const gameOver = this.checkGameOver();

        return { success: true, linesCleared: totalLines, scoreGained, gameOver, placedCells, clearedCells, clearedRows: rows, clearedCols: cols };
    }

    public refillTray(): void {
        const m = this.computeDDA();
        const fillRate = this.grid.getFillRate();
        // Only trigger when board is critically full (fill rate >80%) and rescue not exhausted
        if (fillRate > 0.8 && this.rescueCount < 3) {
            // First priority: at least 1 shape can clear (3 retries)
            for (let attempt = 0; attempt < 3; attempt++) {
                this.tray = getTrayShapesWithDDA(TRAY_COUNT, m);
                if (this.tray.some(s => s && this.grid.canClearAnywhere(s))) {
                    this.rescueCount++;
                    return;
                }
            }
            // Fallback: at least 1 shape can be placed (3 retries)
            for (let attempt = 0; attempt < 3; attempt++) {
                this.tray = getTrayShapesWithDDA(TRAY_COUNT, m);
                if (this.tray.some(s => s && this.grid.canPlaceAnywhere(s))) {
                    this.rescueCount++;
                    return;
                }
            }
        }
        // Normal case or rescue exhausted: just generate
        this.tray = getTrayShapesWithDDA(TRAY_COUNT, m);
    }

    /** Compute DDA multipliers based on board fill rate */
    private computeDDA(): DDAMultipliers {
        const fillRate = this.grid.getFillRate();

        // Base multipliers
        let small = 1.0;   // 1/3-cell
        let medium = 1.0;  // 4/5-cell
        let large = 1.0;   // 6/7/9-cell
        let line = 1.0;    // line shapes

        // Board congestion awareness
        if (fillRate > 0.7) {
            // Crowded: boost small, reduce large
            small *= 1.6;
            large *= 0.4;
        } else if (fillRate < 0.3) {
            // Sparse: boost large, reduce small
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
