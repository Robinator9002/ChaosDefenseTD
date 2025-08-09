// src/components/game/GameCanvas.tsx

import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';
import type { Vector2D, ProjectileInstance } from '../../types/game';

/**
 * A component that now handles both the game logic updates AND the rendering,
 * as well as all direct player input on the game world, like placing towers.
 */
export const GameCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastTimeRef = useRef<number>(0);
    const [mousePosition, setMousePosition] = useState<Vector2D | null>(null);

    // Get reactive state for triggering re-draws and for logic outside the loop
    const selectedTowerForBuild = useGameStore((state) => state.selectedTowerForBuild);
    const gold = useGameStore((state) => state.gold); // Gold is still reactive for UI updates

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
        // Use getState() for actions in event handlers to avoid re-renders if the action changes
        const { placeTower, setSelectedTowerForBuild } = useGameStore.getState();

        if (!mousePosition || !selectedTowerForBuild) return;

        const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
        if (!towerConfig || gold < towerConfig.cost) {
            console.log('Cannot place tower: Not selected, not found, or cannot afford.');
            return;
        }

        const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

        // Convert pixel coordinates to tile coordinates
        const tileX = Math.floor(mousePosition.x / TILE_SIZE);
        const tileY = Math.floor(mousePosition.y / TILE_SIZE);

        // Basic check: Ensure tile is within canvas bounds
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gridWidth = Math.floor(canvas.width / TILE_SIZE);
        const gridHeight = Math.floor(canvas.height / TILE_SIZE);

        if (tileX < 0 || tileX >= gridWidth || tileY < 0 || tileY >= gridHeight) {
            console.log('Cannot place tower: Outside canvas bounds.');
            return;
        }

        // TODO: Add more robust checks here to see if the tile is a valid placement location
        // (e.g., not on a path, not already occupied by another tower, valid terrain type)

        console.log(`Placing ${towerConfig.name} at tile (${tileX}, ${tileY})`);
        placeTower(towerConfig, { x: tileX, y: tileY });

        // Deselect tower after placing
        setSelectedTowerForBuild(null);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get the non-reactive `update` action directly from the store.
        // This ensures the game loop always uses the latest, stable reference.
        const updateGameLogic = useGameStore.getState().update;

        // Set initial canvas size and handle window resizing
        const resizeCanvas = () => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Initial resize

        let animationFrameId: number;

        const gameLoop = (currentTime: number) => {
            const dt = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            // 1. Call the main game update function.
            // This will trigger batched updates in the managers, which then
            // update the Zustand store.
            updateGameLogic(dt);

            // 2. Get the latest state for drawing using useGameStore.getState().
            // This is crucial: it's a direct, non-reactive way to get the current state
            // inside the high-frequency loop without causing GameCanvas to re-render.
            const { towers, enemies, projectiles } = useGameStore.getState();

            // --- DRAWING LOGIC ---
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Draw Background Gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
            gradient.addColorStop(0, '#1a1a2e'); // Dark Blue/Purple
            gradient.addColorStop(1, '#0f0f1c'); // Even darker
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

            // Draw Towers
            Object.values(towers).forEach((tower) => {
                const { tilePosition, config } = tower;
                const x = tilePosition.x * TILE_SIZE;
                const y = tilePosition.y * TILE_SIZE;

                // Tower base color
                ctx.fillStyle = `rgb(${config.placeholder_color.join(',')})`;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // Tower details: a darker inner rectangle
                ctx.fillStyle = `rgba(${config.placeholder_color.join(',')}, 0.7)`;
                ctx.fillRect(
                    x + TILE_SIZE * 0.1,
                    y + TILE_SIZE * 0.1,
                    TILE_SIZE * 0.8,
                    TILE_SIZE * 0.8,
                );

                // Outline
                ctx.strokeStyle = '#dcdcdc'; // Light grey
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            });

            // Draw Enemies
            Object.values(enemies).forEach((enemy) => {
                const { position, config } = enemy;
                const { size, color } = config.render_props;
                ctx.fillStyle = `rgb(${color.join(',')})`;
                ctx.beginPath();
                ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
                ctx.fill();

                // Add an outline to enemies
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
                ctx.lineWidth = 1;
                ctx.stroke();

                // Add a simple shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            });
            // Reset shadow properties after drawing enemies to not affect other elements
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw Projectiles
            Object.values(projectiles).forEach((projectile: ProjectileInstance) => {
                ctx.fillStyle = 'yellow'; // Bright yellow for visibility
                ctx.beginPath();
                ctx.arc(projectile.position.x, projectile.position.y, 4, 0, Math.PI * 2); // Slightly larger
                ctx.fill();

                // Add a glow/shadow to projectiles
                ctx.shadowColor = 'rgba(255, 255, 0, 0.8)'; // Yellow glow
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            });
            // Reset shadow properties after drawing projectiles
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // --- Draw Tower Placement Preview ---
            if (mousePosition && selectedTowerForBuild) {
                const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
                if (towerConfig) {
                    const tileX = Math.floor(mousePosition.x / TILE_SIZE);
                    const tileY = Math.floor(mousePosition.y / TILE_SIZE);
                    const worldX = tileX * TILE_SIZE;
                    const worldY = tileY * TILE_SIZE;

                    // Draw highlighted tile
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Subtle white overlay
                    ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // White border
                    ctx.lineWidth = 1;
                    ctx.strokeRect(worldX, worldY, TILE_SIZE, TILE_SIZE);

                    // Draw range circle
                    ctx.fillStyle = 'rgba(21, 33, 62, 0.5)'; // chaos-highlight with alpha
                    ctx.beginPath();
                    ctx.arc(
                        worldX + TILE_SIZE / 2,
                        worldY + TILE_SIZE / 2,
                        towerConfig.attack?.data.range ?? 0,
                        0,
                        Math.PI * 2,
                    );
                    ctx.fill();

                    // Draw tower ghost
                    ctx.globalAlpha = 0.6;
                    ctx.fillStyle = `rgb(${towerConfig.placeholder_color.join(',')})`;
                    ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
                    ctx.globalAlpha = 1.0;
                }
            }

            // Request the next animation frame
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        // Initialize the game loop
        lastTimeRef.current = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);

        // Cleanup function: cancel the animation frame and remove resize listener when the component unmounts
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []); // The empty dependency array ensures this effect runs only once on mount.

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        />
    );
};
