// src/state/gameStore.ts

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
    GameState,
    AppStatus,
    EnemyInstance,
    TowerInstance,
    Vector2D,
    WaveState,
} from '../types/game';
import type { EnemyTypeConfig } from '../types/configs';

/**
 * Defines the actions that can be performed on the game state.
 * These are the functions that will mutate our state.
 */
interface GameActions {
    setAppStatus: (status: AppStatus) => void;
    addGold: (amount: number) => void;
    removeHealth: (amount: number) => void;

    // New actions for the Wave Manager
    setWaveState: (waveState: Partial<WaveState>) => void;
    spawnEnemy: (config: EnemyTypeConfig, path: Vector2D[]) => void;

    update: (dt: number) => void; // The main game loop update function
}

// Define the initial state of our game
const initialState: GameState = {
    appStatus: 'main-menu',
    gold: 200,
    health: 25,
    currentWave: 0,

    // New state for managing waves
    waveState: {
        waveInProgress: false,
        timeToNextWave: 10, // Initial delay before first wave
        spawnQueue: [],
        spawnCooldown: 0,
    },

    enemies: {},
    towers: {},
    projectiles: {},
    selectedTowerForBuild: null,
    selectedTowerInstanceId: null,
};

/**
 * Create the Zustand store, which combines the state and actions.
 * This hook will be our primary way of interacting with the game's state
 * from anywhere in the component tree.
 */
export const useGameStore = create<GameState & GameActions>((set, get) => ({
    ...initialState,

    // --- ACTIONS ---

    setAppStatus: (status: AppStatus) => set({ appStatus: status }),
    addGold: (amount: number) => set((state) => ({ gold: state.gold + amount })),
    removeHealth: (amount: number) =>
        set((state) => ({ health: Math.max(0, state.health - amount) })),

    /**
     * Updates the state related to wave management.
     * @param waveState A partial object of the wave state to update.
     */
    setWaveState: (waveState: Partial<WaveState>) => {
        set((state) => ({ waveState: { ...state.waveState, ...waveState } }));
    },

    /**
     * Creates a new EnemyInstance and adds it to the game state.
     * @param config The static configuration for the enemy type.
     * @param path The array of Vector2D points the enemy will follow.
     */
    spawnEnemy: (config: EnemyTypeConfig, path: Vector2D[]) => {
        const newEnemy: EnemyInstance = {
            id: uuidv4(),
            config,
            path,
            position: { ...path[0] }, // Start at the beginning of the path
            currentHp: config.base_stats.hp,
            pathIndex: 0,
            effects: [],
            // Base stats are copied, will be modified by scaling/effects later
            currentSpeed: config.base_stats.speed,
            currentArmor: config.base_stats.armor,
        };

        set((state) => ({
            enemies: { ...state.enemies, [newEnemy.id]: newEnemy },
        }));
    },

    /**
     * The main update function, called by the GameLoop on every frame.
     * It orchestrates all the game logic updates.
     * @param dt Delta time - the time elapsed since the last frame in seconds.
     */
    update: (dt: number) => {
        // In the next steps, this function will call the update logic from
        // our manager services, like:
        // waveManager.update(get, set, dt);
        // enemyManager.update(get, set, dt);
        // towerManager.update(get, set, dt);
    },
}));
