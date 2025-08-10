// src/game/utils/mapGenerator.ts

/**
 * This file contains the logic for procedurally generating game maps.
 * It uses a Randomized Depth-First Search (DFS) algorithm to create a maze-like
 * path for enemies, ensuring a valid, connected route from start to finish.
 */

import type { IGridCell, IPathPoint } from '../../types';

// Helper to shuffle an array, used for randomizing directions in DFS.
const shuffle = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

/**
 * The main function to generate a new map.
 * @param gridWidth - The number of cells for the grid's width.
 * @param gridHeight - The number of cells for the grid's height.
 * @returns An object containing the generated grid and the enemy path.
 */
export const generateMap = (
    gridWidth: number,
    gridHeight: number,
): { grid: IGridCell[][]; path: IPathPoint[] } => {
    // 1. Initialize a grid full of walls (or uncarved cells).
    // We'll use a grid of odd dimensions to ensure walls between paths.
    const mazeWidth = Math.floor(gridWidth / 2);
    const mazeHeight = Math.floor(gridHeight / 2);

    const grid: IGridCell[][] = Array.from({ length: gridHeight }, () =>
        Array.from({ length: gridWidth }, () => ({ isPath: false, isOccupied: false })),
    );

    const maze: boolean[][] = Array.from({ length: mazeHeight }, () =>
        Array(mazeWidth).fill(false),
    );

    const pathPoints: { x: number; y: number }[] = [];
    const stack: { x: number; y: number }[] = [];

    // 2. Start the maze generation from a random point on the top edge.
    const startX = Math.floor(Math.random() * mazeWidth);
    const startY = 0;
    stack.push({ x: startX, y: startY });
    maze[startY][startX] = true;

    // Convert maze coordinates to grid coordinates and add to path
    const gridStartX = startX * 2 + 1;
    const gridStartY = startY * 2;
    grid[gridStartY][gridStartX].isPath = true;
    pathPoints.push({ x: gridStartX, y: gridStartY });
    grid[gridStartY + 1][gridStartX].isPath = true;
    pathPoints.push({ x: gridStartX, y: gridStartY + 1 });

    // 3. Run the DFS algorithm.
    while (stack.length > 0) {
        const current = stack[stack.length - 1];

        const directions = shuffle([
            { dx: 0, dy: -1, wallDx: 0, wallDy: -1 }, // Up
            { dx: 0, dy: 1, wallDx: 0, wallDy: 1 }, // Down
            { dx: -1, dy: 0, wallDx: -1, wallDy: 0 }, // Left
            { dx: 1, dy: 0, wallDx: 1, wallDy: 0 }, // Right
        ]);

        let foundNeighbor = false;
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            if (nx >= 0 && nx < mazeWidth && ny >= 0 && ny < mazeHeight && !maze[ny][nx]) {
                // Carve path in the grid
                const wallGridX = current.x * 2 + 1 + dir.wallDx;
                const wallGridY = current.y * 2 + 1 + dir.wallDy;
                const nextGridX = nx * 2 + 1;
                const nextGridY = ny * 2 + 1;

                grid[wallGridY][wallGridX].isPath = true;
                grid[nextGridY][nextGridX].isPath = true;

                pathPoints.push({ x: wallGridX, y: wallGridY });
                pathPoints.push({ x: nextGridX, y: nextGridY });

                maze[ny][nx] = true;
                stack.push({ x: nx, y: ny });
                foundNeighbor = true;
                break;
            }
        }

        if (!foundNeighbor) {
            stack.pop();
        }
    }

    // 4. Create an exit at the bottom edge from the last carved point.
    const lastPoint = pathPoints[pathPoints.length - 1];
    for (let y = lastPoint.y + 1; y < gridHeight; y++) {
        grid[y][lastPoint.x].isPath = true;
        pathPoints.push({ x: lastPoint.x, y });
    }

    // 5. Convert grid coordinates to pixel coordinates for the final path.
    const TILE_SIZE = 50; // This should ideally come from config, but is fine here for generation logic.
    const finalPath = pathPoints.map((p) => ({
        x: p.x * TILE_SIZE + TILE_SIZE / 2,
        y: p.y * TILE_SIZE + TILE_SIZE / 2,
    }));

    // Add entry and exit points just off-canvas
    finalPath.unshift({ x: finalPath[0].x, y: -TILE_SIZE });
    finalPath.push({ x: finalPath[finalPath.length - 1].x, y: gridHeight * TILE_SIZE + TILE_SIZE });

    return { grid, path: finalPath };
};
