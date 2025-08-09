// src/components/game/GameCanvas.tsx

import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';
import type { Vector2D } from '../../types/game';

/**
 * A component that now handles both the game logic updates AND the rendering,
 * as well as all direct player input on the game world, like placing towers.
 */
export const GameCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastTimeRef = useRef<number>(0);
    const [mousePosition, setMousePosition] = useState<Vector2D | null>(null);

    // Get non-reactive state and actions for use inside the high-frequency loop
    const { update, placeTower, setSelectedTowerForBuild } = useGameStore.getState();
    const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

    // Get reactive state for triggering re-draws and for logic outside the loop
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
        if (!mousePosition || !selectedTowerForBuild) return;

        const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
        if (!towerConfig || gold < towerConfig.cost) {
            console.log('Cannot place tower: Not selected, not found, or cannot afford.');
            return;
        }

        // Convert pixel coordinates to tile coordinates
        const tileX = Math.floor(mousePosition.x / TILE_SIZE);
        const tileY = Math.floor(mousePosition.y / TILE_SIZE);

        // TODO: Add check here to see if the tile is a valid placement location

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

        // Set initial canvas size
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        let animationFrameId: number;

        const gameLoop = (currentTime: number) => {
            const dt = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;
            update(dt);

            const { towers, enemies, projectiles } = useGameStore.getState();

            // --- DRAWING LOGIC ---
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Draw Towers
            Object.values(towers).forEach((tower) => {
                const { tilePosition, config } = tower;
                const x = tilePosition.x * TILE_SIZE;
                const y = tilePosition.y * TILE_SIZE;
                ctx.fillStyle = `rgb(${config.placeholder_color.join(',')})`;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#dcdcdc';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            });

            // --- FIXED: Full drawing logic for enemies and projectiles ---
            Object.values(enemies).forEach((enemy) => {
                const { position, config } = enemy;
                const { size, color } = config.render_props;
                ctx.fillStyle = `rgb(${color.join(',')})`;
                ctx.beginPath();
                ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            Object.values(projectiles).forEach((projectile) => {
                ctx.fillStyle = 'yellow';
                ctx.beginPath();
                ctx.arc(projectile.position.x, projectile.position.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // --- Draw Tower Placement Preview ---
            if (mousePosition && selectedTowerForBuild) {
                const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
                if (towerConfig) {
                    const tileX = Math.floor(mousePosition.x / TILE_SIZE);
                    const tileY = Math.floor(mousePosition.y / TILE_SIZE);
                    const worldX = tileX * TILE_SIZE;
                    const worldY = tileY * TILE_SIZE;

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

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        lastTimeRef.current = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

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
