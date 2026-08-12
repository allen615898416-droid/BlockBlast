// Block Blast - 形状库

import { Shape, ShapeCell } from './Types';

interface WeightedShapeDefinition {
    id: string;
    color: number;
    weight: number;
    matrix: number[][];
}

// 颜色索引：0红、1蓝、2绿、3紫、4黄、5橙、6青，分别对应 1/3/5/6/7/4/9 格砖块。
// 概率按 8x12 大棋盘重配：1格 5%、3格 5%、4格 45%、5格 10%、6格 15%、7格 10%、9格 10%。
// 其中 3格保留原有直线块，并加入 SHAPES.md 的 L3；4格及以上同步 SHAPES.md，整体提高大块出现率。
const SHAPE_POOL: WeightedShapeDefinition[] = [
    { id: 'i1', color: 0, weight: 5, matrix: [[1]] },

    { id: 'i3h', color: 1, weight: 1, matrix: [[1, 1, 1]] },
    { id: 'i3v', color: 1, weight: 1, matrix: [[1], [1], [1]] },
    { id: 'l3a', color: 1, weight: 0.75, matrix: [[1, 1], [1, 0]] },
    { id: 'l3b', color: 1, weight: 0.75, matrix: [[1, 1], [0, 1]] },
    { id: 'l3c', color: 1, weight: 0.75, matrix: [[1, 0], [1, 1]] },
    { id: 'l3d', color: 1, weight: 0.75, matrix: [[0, 1], [1, 1]] },

    { id: 'i4h', color: 5, weight: 2, matrix: [[1, 1, 1, 1]] },
    { id: 'i4v', color: 5, weight: 2, matrix: [[1], [1], [1], [1]] },
    { id: 'o4', color: 5, weight: 9, matrix: [[1, 1], [1, 1]] },
    { id: 't4u', color: 5, weight: 2, matrix: [[1, 1, 1], [0, 1, 0]] },
    { id: 't4d', color: 5, weight: 2, matrix: [[0, 1, 0], [1, 1, 1]] },
    { id: 't4l', color: 5, weight: 2, matrix: [[1, 0], [1, 1], [1, 0]] },
    { id: 't4r', color: 5, weight: 2, matrix: [[0, 1], [1, 1], [0, 1]] },
    { id: 'l4a', color: 5, weight: 2, matrix: [[1, 0], [1, 0], [1, 1]] },
    { id: 'l4b', color: 5, weight: 2, matrix: [[1, 1, 1], [1, 0, 0]] },
    { id: 'l4c', color: 5, weight: 2, matrix: [[1, 1], [0, 1], [0, 1]] },
    { id: 'l4d', color: 5, weight: 2, matrix: [[0, 0, 1], [1, 1, 1]] },
    { id: 'j4a', color: 5, weight: 2, matrix: [[0, 1], [0, 1], [1, 1]] },
    { id: 'j4b', color: 5, weight: 2, matrix: [[1, 0, 0], [1, 1, 1]] },
    { id: 'j4c', color: 5, weight: 2, matrix: [[1, 1], [1, 0], [1, 0]] },
    { id: 'j4d', color: 5, weight: 2, matrix: [[1, 1, 1], [0, 0, 1]] },
    { id: 's4h', color: 5, weight: 2, matrix: [[0, 1, 1], [1, 1, 0]] },
    { id: 's4v', color: 5, weight: 2, matrix: [[1, 0], [1, 1], [0, 1]] },
    { id: 'z4h', color: 5, weight: 2, matrix: [[1, 1, 0], [0, 1, 1]] },
    { id: 'z4v', color: 5, weight: 2, matrix: [[0, 1], [1, 1], [1, 0]] },

    { id: 'cross5', color: 2, weight: 10, matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },

    { id: 'rect6h', color: 3, weight: 7.5, matrix: [[1, 1, 1], [1, 1, 1]] },
    { id: 'rect6v', color: 3, weight: 7.5, matrix: [[1, 1], [1, 1], [1, 1]] },

    { id: 'cap7a', color: 4, weight: 2.5, matrix: [[0, 1, 0], [1, 1, 1], [1, 1, 1]] },
    { id: 'cap7b', color: 4, weight: 2.5, matrix: [[1, 1, 0], [1, 1, 1], [1, 1, 0]] },
    { id: 'cap7c', color: 4, weight: 2.5, matrix: [[1, 1, 1], [1, 1, 1], [0, 1, 0]] },
    { id: 'cap7d', color: 4, weight: 2.5, matrix: [[0, 1, 1], [1, 1, 1], [0, 1, 1]] },

    { id: 'square9', color: 6, weight: 10, matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
];

const TOTAL_SHAPE_WEIGHT = SHAPE_POOL.reduce((sum, shape) => sum + shape.weight, 0);

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
    let roll = Math.random() * TOTAL_SHAPE_WEIGHT;
    for (const shape of SHAPE_POOL) {
        roll -= shape.weight;
        if (roll < 0) {
            return matrixToShape(shape.matrix, shape.color);
        }
    }
    const fallback = SHAPE_POOL[SHAPE_POOL.length - 1];
    return matrixToShape(fallback.matrix, fallback.color);
}

export function getTrayShapes(count: number): Shape[] {
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) {
        shapes.push(getRandomShape());
    }
    return shapes;
}
