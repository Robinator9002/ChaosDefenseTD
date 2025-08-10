// src/components/game/GameCanvas.tsx

import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';
import type {
    Vector2D,
    ProjectileInstance,
    TowerInstance,
    EnemyInstance,
} from '../../types/game';
import type { Grid } from '../../services/level_generation/Grid';

// =================================================================
// Drawing Helper Functions
// =================================================================

const drawGrid = (
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    levelStyle: string,
    TILE_SIZE: number,
) => {
    const styleConfig = ConfigService.configs?.levelStyles[levelStyle];
    if (!styleConfig) return;
    const tileDefs = styleConfig.tile_definitions;
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const tile = grid.getTile(x, y);
            if (tile) {
                const def = tileDefs[tile.tileType];
                ctx.fillStyle = def ? `rgb(${def.color.join(',')})` : 'rgb(20, 20, 30)';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
};

const drawTowers = (
    ctx: CanvasRenderingContext2D,
    towers: Record<string, TowerInstance>,
    TILE_SIZE: number,
) => {
    Object.values(towers).forEach((tower) => {
        const { tilePosition, config } = tower;
        const x = tilePosition.x * TILE_SIZE;
        const y = tilePosition.y * TILE_SIZE;
        ctx.fillStyle = `rgb(${config.placeholder_color.join(',')})`;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = `rgba(${config.placeholder_color.join(',')}, 0.7)`;
        ctx.fillRect(x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.1, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        ctx.strokeStyle = '#dcdcdc';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    });
};

const drawEnemies = (ctx: CanvasRenderingContext2D, enemies: Record<string, EnemyInstance>) => {
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};

const drawProjectiles = (
    ctx: CanvasRenderingContext2D,
    projectiles: Record<string, ProjectileInstance>,
) => {
    ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
    ctx.shadowBlur = 8;
    Object.values(projectiles).forEach((projectile) => {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(projectile.position.x, projectile.position.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
};

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
    ctx.fillStyle = canPlace ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = canPlace ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
    if (towerConfig.attack) {
        ctx.fillStyle = 'rgba(21, 33, 62, 0.4)';
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

export const GameCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastTimeRef = useRef<number>(0);
    const [mousePosition, setMousePosition] = useState<Vector2D | null>(null);

    // --- NEW: State for camera panning ---
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef<Vector2D>({ x: 0, y: 0 });

    const selectedTowerForBuild = useGameStore((state) => state.selectedTowerForBuild);

    // --- NEW: Helper function to convert screen coordinates to world coordinates ---
    const screenToWorld = (screenPos: Vector2D): Vector2D => {
        const { camera } = useGameStore.getState();
        return {
            x: (screenPos.x - camera.offset.x) / camera.zoom,
            y: (screenPos.y - camera.offset.y) / camera.zoom,
        };
    };

    // --- Input Handlers ---

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const { camera, setCameraState } = useGameStore.getState();
        const screenPos = { x: event.clientX, y: event.clientY };

        // Handle camera panning if active
        if (isPanning) {
            const dx = screenPos.x - panStartRef.current.x;
            const dy = screenPos.y - panStartRef.current.y;
            setCameraState({ offset: { x: camera.offset.x + dx, y: camera.offset.y + dy } });
            panStartRef.current = screenPos;
        }

        // Update mouse position for UI previews, converting to world space
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const canvasPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        setMousePosition(screenToWorld(canvasPos));
    };

    const handleMouseLeave = () => {
        setMousePosition(null);
        setIsPanning(false); // Stop panning if mouse leaves canvas
    };

    const handleClick = () => {
        if (!mousePosition) return;
        const { placeTower, setSelectedTowerForBuild, grid, gold } = useGameStore.getState();
        if (!selectedTowerForBuild || !grid) return;

        const towerConfig = ConfigService.configs?.towerTypes[selectedTowerForBuild];
        if (!towerConfig || gold < towerConfig.cost) return;

        const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;
        const tileX = Math.floor(mousePosition.x / TILE_SIZE);
        const tileY = Math.floor(mousePosition.y / TILE_SIZE);

        const targetTile = grid.getTile(tileX, tileY);
        if (!targetTile || targetTile.tileType !== 'BUILDABLE') return;

        placeTower(towerConfig, { x: tileX, y: tileY });
        setSelectedTowerForBuild(null);
    };

    // --- NEW: Handlers for Panning and Zooming ---
    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        // Middle mouse button for panning
        if (event.button === 1) {
            event.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: event.clientX, y: event.clientY };
        }
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (event.button === 1) {
            setIsPanning(false);
        }
    };

    const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        const { camera, setCameraState } = useGameStore.getState();
        const zoomSensitivity = 0.1;
        const minZoom = 0.5;
        const maxZoom = 2.0;

        let newZoom = camera.zoom - event.deltaY * zoomSensitivity * 0.05;
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom)); // Clamp zoom

        setCameraState({ zoom: newZoom });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const updateGameLogic = useGameStore.getState().update;

        const resizeCanvas = () => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let animationFrameId: number;

        const gameLoop = (currentTime: number) => {
            const dt = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            updateGameLogic(dt);

            const { towers, enemies, projectiles, grid, levelStyle, camera } =
                useGameStore.getState();
            const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // --- NEW: Apply Camera Transformations ---
            ctx.save();
            ctx.translate(camera.offset.x, camera.offset.y);
            ctx.scale(camera.zoom, camera.zoom);

            // --- Draw World-Space Elements ---
            if (grid && levelStyle) {
                drawGrid(ctx, grid, levelStyle, TILE_SIZE);
            } else {
                ctx.fillStyle = '#0f0f1c';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            drawTowers(ctx, towers, TILE_SIZE);
            drawEnemies(ctx, enemies);
            drawProjectiles(ctx, projectiles);

            if (mousePosition && selectedTowerForBuild && grid) {
                drawPlacementPreview(ctx, mousePosition, selectedTowerForBuild, grid, TILE_SIZE);
            }

            // --- NEW: Restore context to draw screen-space elements if any ---
            ctx.restore();

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        lastTimeRef.current = performance.now();
        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full bg-chaos-primary"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
        />
    );
};
