// Block Blast - 形状库

import { Shape, ShapeCell } from './Types';

// 所有形状定义 (1=填充, 0=空)
const SHAPE_MATRIX: number[][][] = [
    // 单块
    [[1]],

    // 两块
    [[1, 1]],
    [[1], [1]],

    // 三块直线
    [[1, 1, 1]],
    [[1], [1], [1]],

    // 四块直线
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],

    // 五块直线
    [[1, 1, 1, 1, 1]],
    [[1], [1], [1], [1], [1]],

    // 2x2 方块
    [[1, 1], [1, 1]],

    // 3x3 方块
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],

    // 小L (3块, 4方向)
    [[1, 0], [1, 1]],
    [[1, 1], [0, 1]],
    [[0, 1], [1, 1]],
    [[1, 1], [1, 0]],

    // 大L (4块, 4方向)
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]],
    [[0, 0, 1], [1, 1, 1]],

    // T形 (4块, 4方向)
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[0, 1], [1, 1], [0, 1]],

    // S/Z形 (4块, 4方向)
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[1, 0], [1, 1], [0, 1]],
    [[0, 1], [1, 1], [1, 0]],

    // 超大L (5块, 4方向)
    [[1, 0], [1, 0], [1, 0], [1, 1]],
    [[1, 1, 1, 1], [1, 0, 0, 0]],
    [[1, 1], [0, 1], [0, 1], [0, 1]],
    [[0, 0, 0, 1], [1, 1, 1, 1]],
];

const COLOR_COUNT = 8;

export function matrixToShape(matrix: number[][], color: number): Shape {
    const cells: ShapeCell[] = [];
    let maxWidth = 0;
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col] === 1) {
                cells.push({ row, col });
            }
            if (matrix[row].length > maxWidth) {
                maxWidth = matrix[row].length;
            }
        }
    }
    return {
        cells,
        color,
        width: maxWidth,
        height: matrix.length,
    };
}

export function getRandomShape(): Shape {
    const matrix = SHAPE_MATRIX[Math.floor(Math.random() * SHAPE_MATRIX.length)];
    const color = Math.floor(Math.random() * COLOR_COUNT);
    return matrixToShape(matrix, color);
}

export function getTrayShapes(count: number): Shape[] {
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) {
        shapes.push(getRandomShape());
    }
    return shapes;
}
