// Block Blast - 类型定义

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

export interface PlacementResult {
    success: boolean;
    linesCleared: number;
    scoreGained: number;
    gameOver: boolean;
}
