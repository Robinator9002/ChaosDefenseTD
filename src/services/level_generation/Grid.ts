// src/services/level_generation/Grid.ts

import type { TileType } from '../../types/configs';

/**
 * Represents a single tile on the game grid.
 * It holds its position and a 'key' that references its type.
 */
export interface Tile {
    x: number;
    y: number;
    tileType: TileType; // e.g., 'PATH', 'BUILDABLE', 'MOUNTAIN'
}

/**
 * Represents the entire game map as a 2D grid of Tile objects.
 * This class manages the logical structure of the level, providing methods
 * to access and modify tiles. It is simply a container for the level's layout.
 */
export class Grid {
    public width: number;
    public height: number;
    private _grid: Tile[][];

    constructor(width: number, height: number) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
            throw new Error('Grid dimensions must be positive integers.');
        }

        this.width = width;
        this.height = height;
        this._grid = [];
        this.initializeGrid();
        console.log(`Initialized a ${width}x${height} grid.`);
    }

    /**
     * Fills the grid with default Tile objects.
     * FIX: The default tile type is now 'BUILDABLE' (uppercase) to match the TileType definition.
     */
    private initializeGrid(defaultTileType: TileType = 'BUILDABLE'): void {
        this._grid = Array(this.height)
            .fill(null)
            .map((_, y) =>
                Array(this.width)
                    .fill(null)
                    .map((_, x) => ({ x, y, tileType: defaultTileType })),
            );
    }

    /**
     * Checks if a given coordinate is within the bounds of the grid.
     */
    public isValidCoord(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Retrieves the Tile object at a specific coordinate.
     */
    public getTile(x: number, y: number): Tile | null {
        if (!this.isValidCoord(x, y)) {
            return null;
        }
        return this._grid[y][x];
    }

    /**
     * Changes the type of a tile at a specific coordinate.
     */
    public setTileType(x: number, y: number, tileType: TileType): void {
        if (!this.isValidCoord(x, y)) {
            throw new Error(
                `Coordinate (${x}, ${y}) is out of grid bounds (${this.width}x${this.height}).`,
            );
        }
        this._grid[y][x].tileType = tileType;
    }

    /**
     * Returns the raw 2D array of tile types (for drawing or pathfinding input).
     * This converts the Tile objects into a simpler numerical representation.
     */
    public getGridData(): number[][] {
        // FIX: This map now correctly uses the uppercase TileType values.
        // The generic 'obstacle' has been removed in favor of specific feature types.
        const typeMap: Record<TileType, number> = {
            empty: 0,
            BUILDABLE: 1,
            PATH: 2,
            MOUNTAIN: 3,
            LAKE: 3,
            TREE: 3,
            BORDER: 3,
            BASE_ZONE: 3,
            spawn: 4,
            end: 5,
        };

        return this._grid.map(
            (row) => row.map((tile) => typeMap[tile.tileType] ?? typeMap['empty']), // Default to empty if type not mapped
        );
    }

    /**
     * Returns a list of all tiles that match a given type.
     */
    public getTilesByType(tileType: TileType): Tile[] {
        const tiles: Tile[] = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this._grid[y][x].tileType === tileType) {
                    tiles.push(this._grid[y][x]);
                }
            }
        }
        return tiles;
    }
}
