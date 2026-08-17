// Block Blast - Shape Library

import { Shape, ShapeCell } from './Types';

interface WeightedShapeDefinition {
    id: string;
    color: number;
    weight: number;
    matrix: number[][];
}

// Color index: 0=red, 1=blue, 2=green, 3=purple, 4=yellow, 5=orange, 6=cyan. -1 = random color.
// Probability: 1-cell 5%, 3-cell 10%, 4-cell 71%, 5-cell 4%, 6-cell 4%, 7-cell 3%, 9-cell 3%.
const SHAPE_POOL: WeightedShapeDefinition[] = [
    { id: 'i1', color: 0, weight: 5, matrix: [[1]] },

    { id: 'i3h', color: 1, weight: 2, matrix: [[1, 1, 1]] },
    { id: 'i3v', color: 1, weight: 2, matrix: [[1], [1], [1]] },
    { id: 'l3a', color: 1, weight: 1.5, matrix: [[1, 1], [1, 0]] },
    { id: 'l3b', color: 1, weight: 1.5, matrix: [[1, 1], [0, 1]] },
    { id: 'l3c', color: 1, weight: 1.5, matrix: [[1, 0], [1, 1]] },
    { id: 'l3d', color: 1, weight: 1.5, matrix: [[0, 1], [1, 1]] },

    { id: 'i4h', color: -1, weight: 3.74, matrix: [[1, 1, 1, 1]] },
    { id: 'i4v', color: -1, weight: 3.74, matrix: [[1], [1], [1], [1]] },
    { id: 'o4', color: -1, weight: 3.74, matrix: [[1, 1], [1, 1]] },
    { id: 't4u', color: -1, weight: 3.74, matrix: [[1, 1, 1], [0, 1, 0]] },
    { id: 't4d', color: -1, weight: 3.74, matrix: [[0, 1, 0], [1, 1, 1]] },
    { id: 't4l', color: -1, weight: 3.74, matrix: [[1, 0], [1, 1], [1, 0]] },
    { id: 't4r', color: -1, weight: 3.74, matrix: [[0, 1], [1, 1], [0, 1]] },
    { id: 'l4a', color: -1, weight: 3.74, matrix: [[1, 0], [1, 0], [1, 1]] },
    { id: 'l4b', color: -1, weight: 3.74, matrix: [[1, 1, 1], [1, 0, 0]] },
    { id: 'l4c', color: -1, weight: 3.74, matrix: [[1, 1], [0, 1], [0, 1]] },
    { id: 'l4d', color: -1, weight: 3.74, matrix: [[0, 0, 1], [1, 1, 1]] },
    { id: 'j4a', color: -1, weight: 3.74, matrix: [[0, 1], [0, 1], [1, 1]] },
    { id: 'j4b', color: -1, weight: 3.74, matrix: [[1, 0, 0], [1, 1, 1]] },
    { id: 'j4c', color: -1, weight: 3.74, matrix: [[1, 1], [1, 0], [1, 0]] },
    { id: 'j4d', color: -1, weight: 3.74, matrix: [[1, 1, 1], [0, 0, 1]] },
    { id: 's4h', color: -1, weight: 3.74, matrix: [[0, 1, 1], [1, 1, 0]] },
    { id: 's4v', color: -1, weight: 3.74, matrix: [[1, 0], [1, 1], [0, 1]] },
    { id: 'z4h', color: -1, weight: 3.74, matrix: [[1, 1, 0], [0, 1, 1]] },
    { id: 'z4v', color: -1, weight: 3.74, matrix: [[0, 1], [1, 1], [1, 0]] },

    { id: 'u5a', color: 2, weight: 1, matrix: [[1, 0, 1], [1, 1, 1]] },
    { id: 'u5b', color: 2, weight: 1, matrix: [[1, 1, 1], [1, 0, 1]] },
    { id: 'u5c', color: 2, weight: 1, matrix: [[1, 1], [0, 1], [1, 1]] },
    { id: 'u5d', color: 2, weight: 1, matrix: [[1, 1], [1, 0], [1, 1]] },

    { id: 'rect6h', color: 3, weight: 2, matrix: [[1, 1, 1], [1, 1, 1]] },
    { id: 'rect6v', color: 3, weight: 2, matrix: [[1, 1], [1, 1], [1, 1]] },

    { id: 'cap7a', color: 4, weight: 0.75, matrix: [[0, 1, 0], [1, 1, 1], [1, 1, 1]] },
    { id: 'cap7b', color: 4, weight: 0.75, matrix: [[1, 1, 0], [1, 1, 1], [1, 1, 0]] },
    { id: 'cap7c', color: 4, weight: 0.75, matrix: [[1, 1, 1], [1, 1, 1], [0, 1, 0]] },
    { id: 'cap7d', color: 4, weight: 0.75, matrix: [[0, 1, 1], [1, 1, 1], [0, 1, 1]] },

    { id: 'square9', color: 6, weight: 3, matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
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
            const color = shape.color < 0 ? Math.floor(Math.random() * 7) : shape.color;
            return matrixToShape(shape.matrix, color);
        }
    }
    const fallback = SHAPE_POOL[SHAPE_POOL.length - 1];
    const color = fallback.color < 0 ? Math.floor(Math.random() * 7) : fallback.color;
    return matrixToShape(fallback.matrix, color);
}

export function getInitialTrayShapes(count: number): Shape[] {
    return getTrayShapes(count);
}

export function getTrayShapes(count: number): Shape[] {
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) {
        shapes.push(getRandomShape());
    }
    return shapes;
}

// ========== DDA (Dynamic Difficulty Adjustment) ==========

export interface DDAMultipliers {
    small: number;   // multiplier for 1/3-cell shapes
    medium: number;  // multiplier for 4/5-cell shapes
    large: number;   // multiplier for 6/7/9-cell shapes
    line: number;    // extra multiplier for line shapes
}

const LINE_IDS = new Set(['i3h', 'i3v', 'i4h', 'i4v']);

function getCellCount(matrix: number[][]): number {
    let count = 0;
    for (const row of matrix) for (const v of row) if (v === 1) count++;
    return count;
}

export function getTrayShapesWithDDA(count: number, m: DDAMultipliers): Shape[] {
    const pool = SHAPE_POOL.map(s => {
        const cells = getCellCount(s.matrix);
        let mult = cells <= 3 ? m.small : cells <= 5 ? m.medium : m.large;
        if (LINE_IDS.has(s.id)) mult *= m.line;
        return { def: s, weight: s.weight * mult };
    });
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) {
        let roll = Math.random() * total;
        for (const p of pool) {
            roll -= p.weight;
            if (roll < 0) {
                const color = p.def.color < 0 ? Math.floor(Math.random() * 7) : p.def.color;
                shapes.push(matrixToShape(p.def.matrix, color));
                break;
            }
        }
    }
    return shapes;
}
