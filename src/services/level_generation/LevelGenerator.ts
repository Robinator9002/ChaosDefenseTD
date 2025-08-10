// src/services/level_generation/LevelGenerator.ts

import type { LevelGenerationParams, LevelStyleConfig } from '../../types/configs';
import type { Vector2D } from '../../types/game';
import { Grid } from './Grid';
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
        console.log(`Starting level generation for style: ${styleName}`);
        const levelStyles = ConfigService.configs?.levelStyles;

        if (!levelStyles || !levelStyles[styleName]) {
            console.error(`[LevelGenerator] Level style "${styleName}" not found in configs.`);
            return null;
        }

        const style: LevelStyleConfig = levelStyles[styleName];
        const params: LevelGenerationParams = style.generation_params;

        // 1. Initialize the Grid
        const grid = new Grid(params.grid_width, params.grid_height);

        // TODO:
        // 2. Implement Path Generation Logic
        // 3. Implement Feature Placement Logic
        // 4. Finalize and return the result

        console.log(`Successfully created grid for style: ${styleName}`);

        // For now, we return a placeholder result. This will be replaced
        // once path generation is implemented.
        return {
            grid,
            paths: [], // Placeholder for calculated paths
        };
    }

    // --- Private Helper Methods for Generation ---
    // (These will be implemented in the next steps)

    /**
     * Generates all enemy paths for the level based on the configuration.
     * @param grid - The Grid instance to carve paths into.
     * @param params - The generation parameters for the current level style.
     * @returns An array of paths, where each path is an array of Vector2D points.
     */
    private generatePaths(grid: Grid, params: LevelGenerationParams): Vector2D[][] {
        console.log('Path generation not yet implemented.');
        // This is where we'll add logic for 'elbow', 'wandering', etc.
        return [];
    }

    /**
     * Places environmental features (obstacles) onto the grid.
     * @param grid - The Grid instance to add features to.
     * @param params - The generation parameters for the current level style.
     */
    private placeFeatures(grid: Grid, params: LevelGenerationParams): void {
        console.log('Feature placement not yet implemented.');
        // This is where we'll add logic for placing mountains, lakes, etc.
    }
}

export default new LevelGenerator();
