// Block Blast - Type Definitions

export interface ShapeCell {
    row: number;
    col: number;
}

export interface Shape {
    cells: ShapeCell[];
    color: number;
    width: number;
    height: number;
}

export interface GridPosition {
    row: number;
    col: number;
}

export interface LineCheckResult {
    rows: number[];
    cols: number[];
}

export interface PlacementResult {
    success: boolean;
    linesCleared: number;
    scoreGained: number;
    gameOver: boolean;
    placedCells: GridPosition[];
    clearedCells: GridPosition[];
    clearedRows: number[];
    clearedCols: number[];
}
