// Block Blast - 形状库

import { Shape, ShapeCell } from './Types';

interface ShapeCategory {
    color: number;
    matrices: number[][][];
}

// 候选方块：分别由 1/3/5/6/7/9 个块构成，颜色由类别固定
const SHAPE_CATEGORIES: ShapeCategory[] = [
    {
        // 1块：红色
        color: 0,
        matrices: [
            [[1]],
        ],
    },
    {
        // 3块：蓝色，当前先保留原有6种
        color: 1,
        matrices: [
            [[1, 1, 1]],
            [[1], [1], [1]],
            [[1, 0], [1, 1]],
            [[0, 1], [1, 1]],
            [[1, 1], [1, 0]],
            [[1, 1], [0, 1]],
        ],
    },
    {
        // 5块：绿色，只保留5-7十字
        color: 2,
        matrices: [
            [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
        ],
    },
    {
        // 6块：紫色，横3纵2
        color: 3,
        matrices: [
            [[1, 1, 1], [1, 1, 1]],
        ],
    },
    {
        // 7块：黄色，基于6块在中间列向上/向下加一格
        color: 4,
        matrices: [
            [[0, 1, 0], [1, 1, 1], [1, 1, 1]],
            [[1, 1, 1], [1, 1, 1], [0, 1, 0]],
        ],
    },
    {
        // 9块：紫色，只保留3x3
        color: 3,
        matrices: [
            [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        ],
    },
];

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
    const category = SHAPE_CATEGORIES[Math.floor(Math.random() * SHAPE_CATEGORIES.length)];
    const matrix = category.matrices[Math.floor(Math.random() * category.matrices.length)];
    return matrixToShape(matrix, category.color);
}

export function getTrayShapes(count: number): Shape[] {
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) {
        shapes.push(getRandomShape());
    }
    return shapes;
}
