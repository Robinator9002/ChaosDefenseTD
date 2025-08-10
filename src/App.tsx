// src/App.tsx

/**
 * This is the main application component. It now orchestrates not only the game UI
 * but also the initial asynchronous loading of all game configuration data from JSON files.
 */

import { useState, useEffect, useRef } from 'react';

// Import UI Components
import { HUD } from './components/hud/HUD';
import { TowerPanel } from './components/panels/TowerPanel';
import { Modal } from './components/modals/Modal';

// Import Game Logic & Engine
import { useGameLoop } from './game/hooks/useGameLoop';
import { Tower, Enemy, Projectile, Effect } from './game/classes/indexClasses';
import { getDistance } from './game/utils/helpers';
// FIXED: TILE_SIZE was not imported after being moved from this file.
import { TILE_SIZE } from './game/config/constants';

// Import Types
import type {
    IGameState,
    IModalState,
    IGridCell,
    IPathPoint,
    IVector,
    ITowerType,
    IEnemyType,
    IWave,
} from './types';

// Define a new type for the loaded configuration data.
export type GameConfig = {
    towers: { [key: string]: ITowerType };
    enemies: { [key: string]: IEnemyType };
    waves: IWave[];
};

export default function App() {
    // --- STATE MANAGEMENT ---
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

    // New state to handle asynchronous loading of config files.
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- REFS ---
    // Game objects
    const towers = useRef<Tower[]>([]);
    const enemies = useRef<Enemy[]>([]);
    const projectiles = useRef<Projectile[]>([]);
    const effects = useRef<Effect[]>([]);
    const grid = useRef<IGridCell[][]>([]);
    const path = useRef<IPathPoint[]>([]);
    const mousePos = useRef<IVector>({ x: 0, y: 0 });
    const nextId = useRef<number>(0);

    // This ref will hold our game configuration once loaded.
    const gameConfig = useRef<GameConfig | null>(null);

    // DOM element refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);

    // --- DATA LOADING & INITIALIZATION ---
    useEffect(() => {
        const fetchGameConfig = async () => {
            try {
                // Use Promise.all to fetch all config files in parallel.
                const [towersRes, enemiesRes, wavesRes] = await Promise.all([
                    fetch('/game-config/entities/towers.json'),
                    fetch('/game-config/entities/enemies/enemies.json'),
                    fetch('/game-config/waves/waves.json'),
                ]);

                // Check if all requests were successful.
                if (!towersRes.ok || !enemiesRes.ok || !wavesRes.ok) {
                    throw new Error('Network response was not ok.');
                }

                // Parse the JSON data.
                const towersData = await towersRes.json();
                const enemiesData = await enemiesRes.json();
                const wavesData = await wavesRes.json();

                // Store the loaded data in our ref.
                gameConfig.current = {
                    towers: towersData,
                    enemies: enemiesData,
                    waves: wavesData,
                };

                // Once data is loaded, stop loading and proceed.
                setIsLoading(false);
            } catch (err) {
                // If any error occurs, update the error state to inform the user.
                setError(
                    err instanceof Error
                        ? err.message
                        : 'An unknown error occurred while loading game data.',
                );
                setIsLoading(false);
            }
        };

        fetchGameConfig();
    }, []); // This effect runs only once on component mount.

    // This effect sets up the canvas and is dependent on the loading state.
    useEffect(() => {
        // Do not proceed if the config is still loading.
        if (isLoading || error) return;

        const canvas = canvasRef.current;
        const container = gameContainerRef.current;
        if (!canvas || !container) return;

        const resizeAndSetup = () => {
            // ... (canvas setup logic remains the same)
            const containerRect = container.getBoundingClientRect();
            canvas.width = containerRect.width;
            canvas.height = containerRect.height;
            const GRID_WIDTH = Math.floor(canvas.width / TILE_SIZE);
            const GRID_HEIGHT = Math.floor(canvas.height / TILE_SIZE);
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
            grid.current = Array.from({ length: GRID_HEIGHT }, () =>
                Array.from({ length: GRID_WIDTH }, () => ({ isPath: false, isOccupied: false })),
            );
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
    }, [isLoading, error]); // Rerun if loading completes or an error occurs.

    // --- GAME ENGINE HOOK ---
    // We pass the config ref to the game loop.
    useGameLoop({
        // FIXED: The hook expects a non-null ref, but it's initialized to null.
        // We can be sure it's not null when the game loop runs, so we can assert it.
        canvasRef: canvasRef,
        gameConfig: gameConfig, // Pass the ref containing loaded data
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
    const handleStartWave = () => {
        if (
            !gameConfig.current ||
            gameState.isWaveActive ||
            gameState.gameOver ||
            gameState.victory
        )
            return;
        const newWave = gameState.wave + 1;
        setGameState((prev) => ({ ...prev, isWaveActive: true, wave: newWave }));

        const waveData =
            gameConfig.current.waves[Math.min(newWave - 1, gameConfig.current.waves.length - 1)];
        let enemiesToSpawn: string[] = [];
        Object.entries(waveData).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) enemiesToSpawn.push(type);
        });
        enemiesToSpawn.sort(() => Math.random() - 0.5);

        let spawnCount = 0;
        const spawnInterval = setInterval(() => {
            if (spawnCount < enemiesToSpawn.length) {
                enemies.current.push(
                    new Enemy(
                        nextId.current++,
                        enemiesToSpawn[spawnCount],
                        path.current,
                        gameConfig.current!.enemies,
                    ),
                );
                spawnCount++;
            } else {
                clearInterval(spawnInterval);
            }
        }, 500);
    };

    const handleCanvasClick = () => {
        if (!gameConfig.current || gameState.gameOver || gameState.victory) return;
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
                const cost = gameConfig.current.towers[selectedTowerType].cost;
                if (gameState.money >= cost) {
                    setGameState((prev) => ({ ...prev, money: prev.money - cost }));
                    const newTower = new Tower(
                        nextId.current++,
                        gridX * TILE_SIZE + TILE_SIZE / 2,
                        gridY * TILE_SIZE + TILE_SIZE / 2,
                        selectedTowerType,
                        gameConfig.current.towers,
                    );
                    towers.current.push(newTower);
                    grid.current[gridY][gridX].isOccupied = true;
                }
            }
        } else {
            setSelectedTower(null);
        }
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
        if (!selectedTower || !gameConfig.current) return;
        const cost = selectedTower.getUpgradeCost();
        if (gameState.money >= cost) {
            setGameState((prev) => ({ ...prev, money: prev.money - cost }));
            selectedTower.level++;
            selectedTower.updateStats();
            const updatedTower = selectedTower;
            setSelectedTower(null);
            setTimeout(() => setSelectedTower(updatedTower), 0);
        }
    };

    const handleSellTower = () => {
        if (!selectedTower || !gameConfig.current) return;
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
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-chaos-primary font-orbitron text-2xl">
                Loading Game Data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-chaos-primary font-orbitron text-2xl text-chaos-accent">
                Error: {error}
            </div>
        );
    }

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
                    onMouseMove={(e) => {
                        const rect = canvasRef.current!.getBoundingClientRect();
                        mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                    }}
                />

                {gameConfig.current && (
                    <>
                        <HUD
                            gameState={gameState}
                            towerTypes={gameConfig.current.towers}
                            selectedTowerType={selectedTowerType}
                            onSelectTower={(type) =>
                                setSelectedTowerType((prev) => (prev === type ? null : type))
                            }
                            onStartWave={handleStartWave}
                        />
                        {selectedTower && (
                            <TowerPanel
                                key={selectedTower.id + '-' + selectedTower.level}
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
                    </>
                )}
            </div>
        </div>
    );
}
