// src/components/game/GameCanvas.tsx

import { useRef, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import type { EnemyInstance, TowerInstance } from '../../types/game';

/**
 * A component responsible for rendering the main game world onto an
 * HTML5 canvas. It subscribes to the game state and redraws the
 * grid, towers, and enemies on every frame.
 */
export const GameCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Subscribe to the parts of the state that we need for rendering.
    // Zustand ensures this component only re-renders when these specific values change.
    const towers = useGameStore((state) => state.towers);
    const enemies = useGameStore((state) => state.enemies);
    const projectiles = useGameStore((state) => state.projectiles);

    const draw = (ctx: CanvasRenderingContext2D) => {
        // Clear the canvas for the new frame
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // --- Draw Background (a simple dark color for now) ---
        ctx.fillStyle = '#1a1a2e'; // chaos-primary color
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // --- Draw Towers ---
        Object.values(towers).forEach((tower) => {
            drawTower(ctx, tower);
        });

        // --- Draw Enemies ---
        Object.values(enemies).forEach((enemy) => {
            drawEnemy(ctx, enemy);
        });

        // --- Draw Projectiles ---
        Object.values(projectiles).forEach((projectile) => {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(projectile.position.x, projectile.position.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const drawTower = (ctx: CanvasRenderingContext2D, tower: TowerInstance) => {
        const { tilePosition, config } = tower;
        const TILE_SIZE = 32; // We'll get this from gameSettings later
        const x = tilePosition.x * TILE_SIZE;
        const y = tilePosition.y * TILE_SIZE;

        // Use the placeholder color from the config
        ctx.fillStyle = `rgb(${config.placeholder_color.join(',')})`;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Add a border to distinguish towers
        ctx.strokeStyle = '#dcdcdc'; // chaos-text
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: EnemyInstance) => {
        const { position, config } = enemy;
        const { size, color } = config.render_props;

        ctx.fillStyle = `rgb(${color.join(',')})`;
        ctx.beginPath();
        ctx.arc(position.x, position.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle resizing
        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
        });
        resizeObserver.observe(canvas);

        let animationFrameId: number;

        // Our render loop
        const render = () => {
            draw(ctx);
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
        };
    }, [draw]); // Rerun effect if the draw function identity changes (which it won't here, but good practice)

    return <canvas ref={canvasRef} className="w-full h-full" />;
};
