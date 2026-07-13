// Block Blast - 8x8 网格数据模型

import { GRID_SIZE } from './Constants';
import { Shape } from './Types';

export class Grid {
    public readonly size: number = GRID_SIZE;
    // 0 = 空, colorIndex+1 = 已填充 (存 color+1 使 0 表示空)
    private cells: Int8Array;

    constructor() {
        this.cells = new Int8Array(GRID_SIZE * GRID_SIZE);
    }

    public getCell(row: number, col: number): number {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return -1;
        return this.cells[row * GRID_SIZE + col];
    }

    public canPlace(shape: Shape, row: number, col: number): boolean {
        for (const cell of shape.cells) {
            const r = row + cell.row;
            const c = col + cell.col;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            if (this.cells[r * GRID_SIZE + c] !== 0) return false;
        }
        return true;
    }

    public place(shape: Shape, row: number, col: number): void {
        for (const cell of shape.cells) {
            const r = row + cell.row;
            const c = col + cell.col;
            this.cells[r * GRID_SIZE + c] = shape.color + 1;
        }
    }

    public checkLines(): { rows: number[]; cols: number[] } {
        const fullRows: number[] = [];
        const fullCols: number[] = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            let full = true;
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.cells[r * GRID_SIZE + c] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) fullRows.push(r);
        }

        for (let c = 0; c < GRID_SIZE; c++) {
            let full = true;
            for (let r = 0; r < GRID_SIZE; r++) {
                if (this.cells[r * GRID_SIZE + c] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) fullCols.push(c);
        }

        return { rows: fullRows, cols: fullCols };
    }

    public clearLines(rows: number[], cols: number[]): void {
        for (const r of rows) {
            for (let c = 0; c < GRID_SIZE; c++) {
                this.cells[r * GRID_SIZE + c] = 0;
            }
        }
        for (const c of cols) {
            for (let r = 0; r < GRID_SIZE; r++) {
                this.cells[r * GRID_SIZE + c] = 0;
            }
        }
    }

    public canPlaceAnywhere(shape: Shape): boolean {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.canPlace(shape, r, c)) return true;
            }
        }
        return false;
    }

    public clear(): void {
        this.cells.fill(0);
    }
}
