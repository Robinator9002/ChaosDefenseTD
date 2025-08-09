// src/components/game/GameCanvas.tsx

import { useRef, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';

/**
 * A component that now handles both the game logic updates AND the rendering.
 * It uses a single, unified requestAnimationFrame loop to ensure perfect
 * synchronization between the game state and what is drawn on screen.
 */
export const GameCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastTimeRef = useRef<number>(0);

    // We get the functions and state non-reactively inside the loop
    // to ensure we always have the absolute latest version.
    const { update } = useGameStore.getState();
    const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

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

        // The unified game loop
        const gameLoop = (currentTime: number) => {
            // 1. Calculate delta time
            const dt = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            // 2. Update the game logic
            update(dt);

            // 3. Get the *new* state after the update
            const { towers, enemies, projectiles } = useGameStore.getState();

            // 4. Draw the new state
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#1a1a2e'; // chaos-primary
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

            // Draw Enemies
            Object.values(enemies).forEach((enemy) => {
                const { position, config } = enemy;
                const { size, color } = config.render_props;
                ctx.fillStyle = `rgb(${color.join(',')})`;
                ctx.beginPath();
                ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Projectiles
            Object.values(projectiles).forEach((projectile) => {
                ctx.fillStyle = 'yellow';
                ctx.beginPath();
                ctx.arc(projectile.position.x, projectile.position.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // 5. Continue the loop
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        // Start the loop
        lastTimeRef.current = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // Run only once on mount

    return <canvas ref={canvasRef} className="w-full h-full" />;
};
