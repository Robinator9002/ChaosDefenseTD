// src/App.tsx

/**
 * This is the main application component. It orchestrates the entire game by:
 * 1. Managing the overall game state (player health, money, wave, etc.).
 * 2. Initializing and managing all dynamic game objects (towers, enemies) using refs.
 * 3. Handling all user input and events from the UI components.
 * 4. Calling the custom useGameLoop hook to run the game's engine.
 * 5. Rendering the main layout and all UI components (HUD, TowerPanel, Modal).
 */

import React, { useState, useEffect, useRef } from 'react';

// Import all our structured modules
import { HUD } from './components/HUD';
import { TowerPanel } from './components/TowerPanel';
import { Modal } from './components/Modal';
import { useGameLoop } from './game/hooks/useGameLoop';
import { Tower, Enemy, Projectile, Effect } from './game/classes/indexClasses';
import { WAVES, TOWER_TYPES, TILE_SIZE } from './game/config/constants';
import { getDistance } from './game/utils/helpers';
// FIXED: Use 'import type' for type-only imports to satisfy verbatimModuleSyntax.
import type { IGameState, IModalState, IGridCell, IPathPoint, IVector } from './game/types';

// The main App component
export default function App() {
    // --- STATE MANAGEMENT ---
    // `useState` is used for data that, when changed, should trigger a re-render of the UI.
    const [gameState, setGameState] = useState<IGameState>({
        playerHealth: 100,
        money: 500,
        wave: 0,
        isWaveActive: false,
        gameOver: false,
        victory: false,
    });
    const [selectedTower, setSelectedTower] = useState<Tower | null>(null);
    const [selectedTowerType, setSelectedTowerType] = useState<string | null>(null);
    const [modal, setModal] = useState<IModalState>({
        show: false,
        title: '',
        text: '',
        color: '',
    });

    // `useRef` is used for data that needs to persist across renders but should NOT trigger a re-render when changed.
    // This is perfect for large arrays of game objects that are updated every frame.
    const towers = useRef<Tower[]>([]);
    const enemies = useRef<Enemy[]>([]);
    const projectiles = useRef<Projectile[]>([]);
    const effects = useRef<Effect[]>([]);
    const grid = useRef<IGridCell[][]>([]);
    const path = useRef<IPathPoint[]>([]);
    const mousePos = useRef<IVector>({ x: 0, y: 0 });
    const nextId = useRef<number>(0);

    // Refs for DOM elements
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);

    // --- GAME INITIALIZATION ---
    // This `useEffect` runs only once when the component mounts. It's responsible for setting up
    // the canvas, defining the enemy path, and creating the placement grid.
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = gameContainerRef.current;
        if (!canvas || !container) return;

        const resizeAndSetup = () => {
            const containerRect = container.getBoundingClientRect();
            canvas.width = containerRect.width;
            canvas.height = containerRect.height;
            const GRID_WIDTH = Math.floor(canvas.width / TILE_SIZE);
            const GRID_HEIGHT = Math.floor(canvas.height / TILE_SIZE);

            // Define path based on canvas dimensions for responsiveness
            path.current = [
                { x: 0, y: TILE_SIZE * Math.floor(GRID_HEIGHT / 3) + TILE_SIZE / 2 },
                {
                    x: TILE_SIZE * Math.floor(GRID_WIDTH * 0.25) + TILE_SIZE / 2,
                    y: TILE_SIZE * Math.floor(GRID_HEIGHT / 3) + TILE_SIZE / 2,
                },
                {
                    x: TILE_SIZE * Math.floor(GRID_WIDTH * 0.25) + TILE_SIZE / 2,
                    y: TILE_SIZE * Math.floor(GRID_HEIGHT * 0.66) + TILE_SIZE / 2,
                },
                {
                    x: TILE_SIZE * Math.floor(GRID_WIDTH * 0.6) + TILE_SIZE / 2,
                    y: TILE_SIZE * Math.floor(GRID_HEIGHT * 0.66) + TILE_SIZE / 2,
                },
                {
                    x: TILE_SIZE * Math.floor(GRID_WIDTH * 0.6) + TILE_SIZE / 2,
                    y: TILE_SIZE * Math.floor(GRID_HEIGHT * 0.2) + TILE_SIZE / 2,
                },
                {
                    x: TILE_SIZE * Math.floor(GRID_WIDTH * 0.85) + TILE_SIZE / 2,
                    y: TILE_SIZE * Math.floor(GRID_HEIGHT * 0.2) + TILE_SIZE / 2,
                },
                { x: TILE_SIZE * Math.floor(GRID_WIDTH * 0.85) + TILE_SIZE / 2, y: canvas.height },
            ];

            // Create grid
            grid.current = Array.from({ length: GRID_HEIGHT }, () =>
                Array.from({ length: GRID_WIDTH }, () => ({ isPath: false, isOccupied: false })),
            );

            // Mark path tiles on the grid
            path.current.forEach((point, i) => {
                if (i === path.current.length - 1) return;
                const nextPoint = path.current[i + 1];
                const startTileX = Math.floor(point.x / TILE_SIZE);
                const startTileY = Math.floor(point.y / TILE_SIZE);
                const endTileX = Math.floor(nextPoint.x / TILE_SIZE);
                const endTileY = Math.floor(nextPoint.y / TILE_SIZE);

                for (
                    let x = Math.min(startTileX, endTileX);
                    x <= Math.max(startTileX, endTileX);
                    x++
                ) {
                    for (
                        let y = Math.min(startTileY, endTileY);
                        y <= Math.max(startTileY, endTileY);
                        y++
                    ) {
                        if (grid.current[y]?.[x]) grid.current[y][x].isPath = true;
                    }
                }
            });
        };

        resizeAndSetup();
        window.addEventListener('resize', resizeAndSetup);
        return () => window.removeEventListener('resize', resizeAndSetup);
    }, []);

    // --- START THE GAME ENGINE ---
    // This calls our custom hook, which encapsulates the entire game loop.
    // The non-null assertion (!) tells TypeScript we are sure canvasRef will not be null here.
    useGameLoop({
        canvasRef: canvasRef!,
        gameState,
        setGameState,
        setModal,
        selectedTower,
        selectedTowerType,
        towers,
        enemies,
        projectiles,
        effects,
        grid,
        path,
        mousePos,
        nextId,
    });

    // --- EVENT HANDLERS ---
    // These functions are passed as props to the UI components.
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleCanvasClick = () => {
        if (gameState.gameOver || gameState.victory) return;
        const { x, y } = mousePos.current;
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);

        const clickedTower = towers.current.find((t) => getDistance({ x, y }, t) < TILE_SIZE * 0.4);
        if (clickedTower) {
            setSelectedTower(clickedTower);
            setSelectedTowerType(null);
            return;
        }

        if (selectedTowerType) {
            if (
                grid.current[gridY]?.[gridX] &&
                !grid.current[gridY][gridX].isPath &&
                !grid.current[gridY][gridX].isOccupied
            ) {
                const cost = TOWER_TYPES[selectedTowerType].cost;
                if (gameState.money >= cost) {
                    setGameState((prev) => ({ ...prev, money: prev.money - cost }));
                    const newTower = new Tower(
                        nextId.current++,
                        gridX * TILE_SIZE + TILE_SIZE / 2,
                        gridY * TILE_SIZE + TILE_SIZE / 2,
                        selectedTowerType,
                    );
                    towers.current.push(newTower);
                    grid.current[gridY][gridX].isOccupied = true;
                }
            }
        } else {
            setSelectedTower(null);
        }
    };

    const handleStartWave = () => {
        if (gameState.isWaveActive || gameState.gameOver || gameState.victory) return;
        const newWave = gameState.wave + 1;
        setGameState((prev) => ({ ...prev, isWaveActive: true, wave: newWave }));

        const waveData = WAVES[Math.min(newWave - 1, WAVES.length - 1)];
        let enemiesToSpawn: string[] = [];
        Object.entries(waveData).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) enemiesToSpawn.push(type);
        });
        enemiesToSpawn.sort(() => Math.random() - 0.5);

        let spawnCount = 0;
        const spawnInterval = setInterval(() => {
            if (spawnCount < enemiesToSpawn.length) {
                enemies.current.push(
                    new Enemy(nextId.current++, enemiesToSpawn[spawnCount], path.current),
                );
                spawnCount++;
            } else {
                clearInterval(spawnInterval);
            }
        }, 500);
    };

    const handleRestart = () => {
        towers.current = [];
        enemies.current = [];
        projectiles.current = [];
        effects.current = [];
        grid.current.forEach((row) => row.forEach((cell) => (cell.isOccupied = false)));
        setSelectedTower(null);
        setSelectedTowerType(null);
        setModal({ show: false, title: '', text: '', color: '' });
        setGameState({
            playerHealth: 100,
            money: 500,
            wave: 0,
            isWaveActive: false,
            gameOver: false,
            victory: false,
        });
    };

    const handleUpgradeTower = () => {
        if (!selectedTower) return;
        const cost = selectedTower.getUpgradeCost();
        if (gameState.money >= cost) {
            setGameState((prev) => ({ ...prev, money: prev.money - cost }));
            selectedTower.level++;
            selectedTower.updateStats();
            // To force a re-render of the panel, we can briefly set the state to null and then back to the
            // (now mutated) tower instance. This preserves the instance and its methods.
            const updatedTower = selectedTower;
            setSelectedTower(null);
            setTimeout(() => setSelectedTower(updatedTower), 0);
        }
    };

    const handleSellTower = () => {
        if (!selectedTower) return;
        setGameState((prev) => ({ ...prev, money: prev.money + selectedTower.getSellValue() }));
        const gridX = Math.floor(selectedTower.x / TILE_SIZE);
        const gridY = Math.floor(selectedTower.y / TILE_SIZE);
        if (grid.current[gridY]?.[gridX]) {
            grid.current[gridY][gridX].isOccupied = false;
        }
        towers.current = towers.current.filter((t) => t.id !== selectedTower.id);
        setSelectedTower(null);
    };

    // --- RENDER METHOD ---
    return (
        <div className="flex items-center justify-center h-screen bg-chaos-primary font-sans">
            <div
                ref={gameContainerRef}
                className="relative w-full max-w-7xl aspect-[16/9] shadow-2xl shadow-chaos-highlight"
            >
                <canvas
                    ref={canvasRef}
                    className="bg-chaos-secondary cursor-pointer"
                    onClick={handleCanvasClick}
                    onMouseMove={handleMouseMove}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedTowerType(null);
                        setSelectedTower(null);
                    }}
                />

                {/* Render UI Components */}
                <HUD
                    gameState={gameState}
                    selectedTowerType={selectedTowerType}
                    onSelectTower={(type) =>
                        setSelectedTowerType((prev) => (prev === type ? null : type))
                    }
                    onStartWave={handleStartWave}
                />

                {selectedTower && (
                    <TowerPanel
                        key={selectedTower.id + '-' + selectedTower.level} // Add key to force re-mount on level change
                        selectedTower={selectedTower}
                        gameState={gameState}
                        onUpgrade={handleUpgradeTower}
                        onSell={handleSellTower}
                        onClose={() => setSelectedTower(null)}
                    />
                )}

                <Modal
                    modalState={modal}
                    isPermanent={gameState.gameOver || gameState.victory}
                    onRestart={handleRestart}
                />
            </div>
        </div>
    );
}
