// src/services/level_generation/LevelGenerator.ts

import type { LevelGenerationParams, LevelStyleConfig, TileType } from '../../types/configs';
import type { Vector2D } from '../../types/game';
import { Grid, type Tile } from './Grid';
import Pathfinder from './Pathfinder';
import ConfigService from '../ConfigService';

/**
 * The result of a level generation process.
 * Contains the logical grid and the calculated paths for enemies.
 */
export interface GenerationResult {
    grid: Grid;
    paths: Vector2D[][];
}

/**
 * A service responsible for procedurally generating game levels based on
 * predefined style configurations. It handles the creation of the grid,
 * carving of paths, and placement of environmental features.
 */
class LevelGenerator {
    /**
     * The main public method to generate a complete level.
     * It orchestrates the entire process from reading configs to returning a playable map.
     * @param styleName - The key of the level style to use from `level_styles.json`.
     * @returns A `GenerationResult` object containing the grid and enemy paths, or null if generation fails.
     */
    public generateLevel(styleName: string): GenerationResult | null {
        console.log(`[LevelGenerator] Starting level generation for style: ${styleName}`);
        const levelStyles = ConfigService.configs?.levelStyles;

        if (!levelStyles || !levelStyles[styleName]) {
            console.error(`[LevelGenerator] Level style "${styleName}" not found in configs.`);
            return null;
        }

        const style: LevelStyleConfig = levelStyles[styleName];
        const params: LevelGenerationParams = style.generation_params;
        const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

        const grid = new Grid(params.grid_width, params.grid_height);
        const tilePaths = this.generatePaths(grid, params);

        if (tilePaths.length === 0) {
            console.error('[LevelGenerator] Failed to generate any valid paths.');
            return null;
        }

        this.placeFeatures(grid, params);

        const pixelPaths = tilePaths.map((path) =>
            path.map((tile) => ({
                x: tile.x * TILE_SIZE + TILE_SIZE / 2,
                y: tile.y * TILE_SIZE + TILE_SIZE / 2,
            })),
        );

        console.log(
            `[LevelGenerator] Successfully generated level for style: ${styleName} with ${pixelPaths.length} path(s).`,
        );

        return {
            grid,
            paths: pixelPaths,
        };
    }

    // --- Private Helper Methods for Generation ---

    private generatePaths(grid: Grid, params: LevelGenerationParams): Tile[][] {
        const finalPaths: Tile[][] = [];
        const pathConfigs = params.paths_config;

        for (const pathType in pathConfigs) {
            const count = pathConfigs[pathType];
            for (let i = 0; i < count; i++) {
                let pathTiles: Tile[] | null = null;
                switch (pathType) {
                    case 'elbow':
                        pathTiles = this.generateElbowPath(grid);
                        break;
                    // --- NEW: Handle wandering path generation ---
                    case 'wandering':
                        pathTiles = this.generateWanderingPath(grid);
                        break;
                    default:
                        console.warn(`[LevelGenerator] Unknown path type: ${pathType}`);
                }

                if (pathTiles) {
                    finalPaths.push(pathTiles);
                }
            }
        }
        return finalPaths;
    }

    /**
     * NEW: Generates a single, meandering path using a randomized walk.
     * @param grid - The grid to operate on.
     * @returns An array of Tile objects representing the path, or null if it fails.
     */
    private generateWanderingPath(grid: Grid): Tile[] | null {
        const margin = 5; // Give wandering path more room to breathe
        const startY = Math.floor(Math.random() * (grid.height - margin * 2)) + margin;
        const start: Vector2D = { x: 0, y: startY };
        const end: Vector2D = { x: grid.width - 1, y: 0 }; // End Y is determined by the walk

        let currentX = start.x;
        let currentY = start.y;
        let endY = -1;

        // A simple "drunken walk" algorithm
        while (currentX < grid.width - 1) {
            // Carve current position
            if (grid.isValidCoord(currentX, currentY)) {
                grid.setTileType(currentX, currentY, 'PATH');
            }

            // Decide next move
            const roll = Math.random();
            if (roll < 0.6) {
                // 60% chance to move forward
                currentX++;
            } else if (roll < 0.8) {
                // 20% chance to move up
                currentY = Math.max(margin, currentY - 1);
            } else {
                // 20% chance to move down
                currentY = Math.min(grid.height - 1 - margin, currentY + 1);
            }
        }

        // Complete the path to the edge
        endY = currentY;
        this.carveLine(grid, currentX, currentY, grid.width - 1, endY, 'PATH');
        end.y = endY;

        grid.setTileType(start.x, start.y, 'spawn');
        grid.setTileType(end.x, end.y, 'end');

        const pathfinderGrid = this.createPathfinderGrid(grid);
        const tilePathCoords = Pathfinder.findPath(pathfinderGrid, start, end);

        if (tilePathCoords.length === 0) {
            console.error(
                '[LevelGenerator] Pathfinder could not find a route on the carved wandering path.',
            );
            return null;
        }

        return tilePathCoords
            .map((coord) => grid.getTile(coord.x, coord.y))
            .filter(Boolean) as Tile[];
    }

    private generateElbowPath(grid: Grid): Tile[] | null {
        const margin = 3;
        const startY = Math.floor(Math.random() * (grid.height - margin * 2)) + margin;
        const endY = Math.floor(Math.random() * (grid.height - margin * 2)) + margin;
        const start: Vector2D = { x: 0, y: startY };
        const end: Vector2D = { x: grid.width - 1, y: endY };
        const elbowX = Math.floor(Math.random() * (grid.width - margin * 4)) + margin * 2;

        this.carveLine(grid, start.x, start.y, elbowX, start.y, 'PATH');
        this.carveLine(grid, elbowX, start.y, elbowX, end.y, 'PATH');
        this.carveLine(grid, elbowX, end.y, end.x, end.y, 'PATH');

        grid.setTileType(start.x, start.y, 'spawn');
        grid.setTileType(end.x, end.y, 'end');

        const pathfinderGrid = this.createPathfinderGrid(grid);
        const tilePathCoords = Pathfinder.findPath(pathfinderGrid, start, end);

        if (tilePathCoords.length === 0) {
            console.error(
                '[LevelGenerator] Pathfinder could not find a route on the carved elbow path.',
            );
            return null;
        }

        return tilePathCoords
            .map((coord) => grid.getTile(coord.x, coord.y))
            .filter(Boolean) as Tile[];
    }

    private carveLine(grid: Grid, x1: number, y1: number, x2: number, y2: number, type: TileType) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        let x = x1;
        let y = y1;
        while (true) {
            if (grid.isValidCoord(x, y)) {
                grid.setTileType(x, y, type);
            }
            if (x === x2 && y === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    private createPathfinderGrid(grid: Grid): number[][] {
        const pathfinderGrid: number[][] = [];
        for (let y = 0; y < grid.height; y++) {
            pathfinderGrid[y] = [];
            for (let x = 0; x < grid.width; x++) {
                const tile = grid.getTile(x, y);
                const tileType = tile?.tileType;
                const isWalkable =
                    tileType === 'PATH' || tileType === 'spawn' || tileType === 'end';
                pathfinderGrid[y][x] = isWalkable ? 0 : 1;
            }
        }
        return pathfinderGrid;
    }

    private placeFeatures(grid: Grid, params: LevelGenerationParams): void {
        const features = params.features;
        if (!features) return;
        for (const featureName in features) {
            const config = features[featureName];
            const count = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
            const tileType = featureName.slice(0, -1).toUpperCase() as TileType;
            for (let i = 0; i < count; i++) {
                for (let attempt = 0; attempt < 10; attempt++) {
                    const x = Math.floor(Math.random() * grid.width);
                    const y = Math.floor(Math.random() * grid.height);
                    const tile = grid.getTile(x, y);
                    if (tile && tile.tileType === 'BUILDABLE') {
                        grid.setTileType(x, y, tileType);
                        break;
                    }
                }
            }
            console.log(`[LevelGenerator] Placed ${count} of ${featureName}.`);
        }
    }
}

export default new LevelGenerator();
