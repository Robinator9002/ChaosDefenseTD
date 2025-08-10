// src/components/game/GameCanvas.tsx

import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';
import type { Vector2D, ProjectileInstance, TowerInstance, EnemyInstance } from '../../types/game';
import type { Grid } from '../../services/level_generation/Grid';

// =================================================================
// Drawing Helper Functions
// =================================================================
// By defining these as standalone functions, we keep the main game loop clean
// and make the rendering logic for each game element modular and easy to manage.

/**
 * Draws the entire level grid, tile by tile, based on the current level style.
 * @param ctx - The 2D rendering context of the canvas.
 * @param grid - The logical grid object containing all tile data.
 * @param levelStyle - The name of the current level style (e.g., "Forest").
 * @param TILE_SIZE - The size of each tile in pixels.
 */
const drawGrid = (
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    levelStyle: string,
    TILE_SIZE: number,
) => {
    const styleConfig = ConfigService.configs?.levelStyles[levelStyle];
    if (!styleConfig) return; // Safety check if style config is missing

    const tileDefs = styleConfig.tile_definitions;

    // Iterate over every tile in the grid
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const tile = grid.getTile(x, y);
            if (tile) {
                // Find the definition (color, sprite) for the current tile's type
                const def = tileDefs[tile.tileType];
                ctx.fillStyle = def ? `rgb(${def.color.join(',')})` : 'rgb(20, 20, 30)'; // Fallback color
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
};

/**
 * Draws all placed towers onto the canvas.
 * @param ctx - The 2D rendering context.
 * @param towers - A record of all active TowerInstance objects.
 * @param TILE_SIZE - The size of each tile in pixels.
 */
const drawTowers = (
    ctx: CanvasRenderingContext2D,
    towers: Record<string, TowerInstance>,
    TILE_SIZE: number,
) => {
    Object.values(towers).forEach((tower) => {
        const { tilePosition, config } = tower;
        const x = tilePosition.x * TILE_SIZE;
        const y = tilePosition.y * TILE_SIZE;

        // Draw the main tower body
        ctx.fillStyle = `rgb(${config.placeholder_color.join(',')})`;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Add a slightly darker inner rectangle for detail
        ctx.fillStyle = `rgba(${config.placeholder_color.join(',')}, 0.7)`;
        ctx.fillRect(x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.1, TILE_SIZE * 0.8, TILE_SIZE * 0.8);

        // Add a crisp outline
        ctx.strokeStyle = '#dcdcdc';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    });
};

/**
 * Draws all active enemies onto the canvas.
 * @param ctx - The 2D rendering context.
 * @param enemies - A record of all active EnemyInstance objects.
 */
const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Record<string, EnemyInstance>) => {
    // Apply a shadow effect to all enemies for better depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    Object.values(enemies).forEach((enemy) => {
        const { position, config } = enemy;
        const { size, color } = config.render_props;
        ctx.fillStyle = `rgb(${color.join(',')})`;
        ctx.beginPath();
        ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Add a subtle outline to make enemies pop
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // IMPORTANT: Reset shadow properties so they don't affect subsequent drawings
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};

/**
 * Draws all in-flight projectiles onto the canvas.
 * @param ctx - The 2D rendering context.
 * @param projectiles - A record of all active ProjectileInstance objects.
 */
const drawProjectiles = (
    ctx: CanvasRenderingContext2D,
    projectiles: Record<string, ProjectileInstance>,
) => {
    // Apply a glow effect to all projectiles
    ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
    ctx.shadowBlur = 8;

    Object.values(projectiles).forEach((projectile) => {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // IMPORTANT: Reset shadow properties
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
};

/**
 * Draws the UI preview for placing a new tower, including the highlighted tile and range indicator.
 * @param ctx - The 2D rendering context.
 * @param mousePosition - The current pixel coordinates of the mouse.
 * @param selectedTowerForBuild - The ID of the tower selected in the build menu.
 * @param grid - The logical grid object.
 * @param TILE_SIZE - The size of each tile in pixels.
 */
const drawPlacementPreview = (
    ctx: CanvasRenderingContext2D,
    mousePosition: Vector2D,
    selectedTowerForBuild: string,
    grid: Grid,
    TILE_SIZE: number,
) => {
    const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
    if (!towerConfig) return;

    const tileX = Math.floor(mousePosition.x / TILE_SIZE);
    const tileY = Math.floor(mousePosition.y / TILE_SIZE);
    const worldX = tileX * TILE_SIZE;
    const worldY = tileY * TILE_SIZE;

    const targetTile = grid.getTile(tileX, tileY);
    const canPlace = targetTile?.tileType === 'BUILDABLE';

    // Draw the highlighted tile overlay. Green for valid, red for invalid.
    ctx.fillStyle = canPlace ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);

    // Draw a border around the tile for emphasis.
    ctx.strokeStyle = canPlace ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(worldX, worldY, TILE_SIZE, TILE_SIZE);

    // Draw the tower's attack range circle
    if (towerConfig.attack) {
        ctx.fillStyle = 'rgba(21, 33, 62, 0.4)'; // Semi-transparent blue
        ctx.beginPath();
        ctx.arc(
            worldX + TILE_SIZE / 2,
            worldY + TILE_SIZE / 2,
            towerConfig.attack.data.range,
            0,
            Math.PI * 2,
        );
        ctx.fill();
    }
};

// =================================================================
// Main GameCanvas Component
// =================================================================

/**
 * The core component responsible for rendering the game world and handling
 * direct player input on the canvas. It runs the main game loop, which
 * updates game logic via the Zustand store and then draws the state of
 * all entities onto the HTML5 canvas.
 */
export const GameCanvas = () => {
    // A ref to the canvas DOM element. `useRef` is used because we need direct,
    // mutable access to the canvas for drawing, without triggering React re-renders.
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // A ref to store the timestamp of the last frame. This is essential for
    // calculating delta time (dt) to ensure game logic runs consistently
    // regardless of the frame rate.
    const lastTimeRef = useRef<number>(0);

    // The mouse position is stored in React state because changes to it
    // should trigger a re-render of the placement preview UI elements.
    const [mousePosition, setMousePosition] = useState<Vector2D | null>(null);

    // We subscribe to these specific state slices reactively. The component
    // will only re-render if `selectedTowerForBuild` or `gold` changes, which
    // is important for updating the placement preview and affordability checks.
    const selectedTowerForBuild = useGameStore((state) => state.selectedTowerForBuild);
    const gold = useGameStore((state) => state.gold);

    // --- Input Handlers ---

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        setMousePosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        });
    };

    const handleMouseLeave = () => {
        setMousePosition(null);
    };

    const handleClick = () => {
        // Inside an event handler, it's best to get the latest state and actions
        // directly from the store using `getState()`. This prevents potential issues
        // with stale closures if the event handler was defined in a previous render.
        const { placeTower, setSelectedTowerForBuild, grid, gold } = useGameStore.getState();

        if (!mousePosition || !selectedTowerForBuild || !grid) return;

        const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
        if (!towerConfig || gold < towerConfig.cost) {
            console.log('Cannot place tower: Not selected, not found, or cannot afford.');
            return;
        }

        const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;
        const tileX = Math.floor(mousePosition.x / TILE_SIZE);
        const tileY = Math.floor(mousePosition.y / TILE_SIZE);

        // Validate that the target tile is a valid placement location.
        const targetTile = grid.getTile(tileX, tileY);
        if (!targetTile || targetTile.tileType !== 'BUILDABLE') {
            console.log(`Cannot place tower: Tile (${tileX}, ${tileY}) is not buildable.`);
            return;
        }

        console.log(`Placing ${towerConfig.name} at tile (${tileX}, ${tileY})`);
        placeTower(towerConfig, { x: tileX, y: tileY });
        setSelectedTowerForBuild(null); // Deselect after placing
    };

    // The main `useEffect` hook sets up and tears down the game loop.
    // The empty dependency array `[]` ensures this effect runs exactly ONCE,
    // when the component mounts, and the cleanup function runs when it unmounts.
    // This is the correct pattern for managing persistent processes like a game loop.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
            console.error('Canvas or 2D context not available.');
            return;
        }

        // Get the non-reactive `update` action once. The game loop will always
        // have the correct reference to this function from the store.
        const updateGameLogic = useGameStore.getState().update;

        // --- Canvas Resizing ---
        const resizeCanvas = () => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Set initial size

        let animationFrameId: number;

        // --- The Game Loop ---
        const gameLoop = (currentTime: number) => {
            // Calculate delta time (dt) in seconds.
            const dt = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            // 1. UPDATE LOGIC:
            // This single function call updates all game managers (Enemy, Tower, etc.),
            // which in turn update the central Zustand store.
            updateGameLogic(dt);

            // 2. GET LATEST STATE FOR DRAWING:
            // We use `getState()` here for performance. It's a non-reactive way to
            // get the most current state inside a high-frequency loop without
            // forcing the entire GameCanvas component to re-render every frame.
            const { towers, enemies, projectiles, grid, levelStyle } = useGameStore.getState();
            const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

            // 3. DRAWING:
            // The canvas is cleared and redrawn completely every frame.
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (grid && levelStyle) {
                drawGrid(ctx, grid, levelStyle, TILE_SIZE);
            } else {
                // Fallback background if the grid isn't loaded
                ctx.fillStyle = '#0f0f1c';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            drawTowers(ctx, towers, TILE_SIZE);
            drawEnemies(ctx, enemies);
            drawProjectiles(ctx, projectiles);

            if (mousePosition && selectedTowerForBuild && grid) {
                drawPlacementPreview(ctx, mousePosition, selectedTowerForBuild, grid, TILE_SIZE);
            }

            // Schedule the next frame.
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        // Kick off the loop.
        lastTimeRef.current = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);

        // Cleanup function: This is critical for preventing memory leaks.
        // When the component unmounts (e.g., navigating away from the game),
        // we must cancel the animation frame and remove the event listener.
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []); // Empty dependency array ensures this runs only on mount/unmount.

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full" // Let CSS handle the display size
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        />
    );
};
