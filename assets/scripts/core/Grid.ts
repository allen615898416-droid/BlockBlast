// Block Blast - 8x12 网格数据模型

import { GRID_COLS, GRID_ROWS } from './Constants';
import { GridPosition, LineCheckResult, Shape } from './Types';

export class Grid {
    public readonly rows: number = GRID_ROWS;
    public readonly cols: number = GRID_COLS;
    // 0 = 空, colorIndex+1 = 已填充 (存 color+1 使 0 表示空)
    private cells: Int8Array;

    constructor() {
        this.cells = new Int8Array(GRID_ROWS * GRID_COLS);
    }

    public getCell(row: number, col: number): number {
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return -1;
        return this.cells[row * GRID_COLS + col];
    }

    public canPlace(shape: Shape, row: number, col: number): boolean {
        for (const cell of shape.cells) {
            const r = row + cell.row;
            const c = col + cell.col;
            if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return false;
            if (this.cells[r * GRID_COLS + c] !== 0) return false;
        }
        return true;
    }

    public getShapeCells(shape: Shape, row: number, col: number): GridPosition[] {
        return shape.cells.map(cell => ({ row: row + cell.row, col: col + cell.col }));
    }

    public place(shape: Shape, row: number, col: number): void {
        for (const cell of shape.cells) {
            const r = row + cell.row;
            const c = col + cell.col;
            this.cells[r * GRID_COLS + c] = shape.color + 1;
        }
    }

    public checkLines(): LineCheckResult {
        return this.checkLinesWithShape(null, 0, 0);
    }

    public checkLinesWithShape(shape: Shape | null, row: number, col: number): LineCheckResult {
        const fullRows: number[] = [];
        const fullCols: number[] = [];
        const virtualCells = new Set<string>();

        if (shape) {
            for (const cell of shape.cells) {
                virtualCells.add(`${row + cell.row}:${col + cell.col}`);
            }
        }

        const isFilled = (r: number, c: number): boolean => {
            return this.cells[r * GRID_COLS + c] !== 0 || virtualCells.has(`${r}:${c}`);
        };

        for (let r = 0; r < GRID_ROWS; r++) {
            let full = true;
            for (let c = 0; c < GRID_COLS; c++) {
                if (!isFilled(r, c)) {
                    full = false;
                    break;
                }
            }
            if (full) fullRows.push(r);
        }

        for (let c = 0; c < GRID_COLS; c++) {
            let full = true;
            for (let r = 0; r < GRID_ROWS; r++) {
                if (!isFilled(r, c)) {
                    full = false;
                    break;
                }
            }
            if (full) fullCols.push(c);
        }

        return { rows: fullRows, cols: fullCols };
    }

    public getLineCells(rows: number[], cols: number[]): GridPosition[] {
        const result: GridPosition[] = [];
        const seen = new Set<string>();
        for (const r of rows) {
            for (let c = 0; c < GRID_COLS; c++) {
                const key = `${r}:${c}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push({ row: r, col: c });
                }
            }
        }
        for (const c of cols) {
            for (let r = 0; r < GRID_ROWS; r++) {
                const key = `${r}:${c}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push({ row: r, col: c });
                }
            }
        }
        return result;
    }

    public clearLines(rows: number[], cols: number[]): void {
        for (const r of rows) {
            for (let c = 0; c < GRID_COLS; c++) {
                this.cells[r * GRID_COLS + c] = 0;
            }
        }
        for (const c of cols) {
            for (let r = 0; r < GRID_ROWS; r++) {
                this.cells[r * GRID_COLS + c] = 0;
            }
        }
    }

    public canPlaceAnywhere(shape: Shape): boolean {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (this.canPlace(shape, r, c)) return true;
            }
        }
        return false;
    }

    /** 检查某个形状放在棋盘任意位置能否触发消除 */
    public canClearAnywhere(shape: Shape): boolean {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (this.canPlace(shape, r, c)) {
                    const result = this.checkLinesWithShape(shape, r, c);
                    if (result.rows.length > 0 || result.cols.length > 0) return true;
                }
            }
        }
        return false;
    }

    public clear(): void {
        this.cells.fill(0);
    }

    /** 返回棋盘填充率 0~1 */
    public getFillRate(): number {
        let filled = 0;
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] !== 0) filled++;
        }
        return filled / this.cells.length;
    }
}
