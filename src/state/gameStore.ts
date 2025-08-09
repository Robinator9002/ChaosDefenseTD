// src/state/gameStore.ts

import { create, type StoreApi } from 'zustand';
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
import WaveManager from '../services/WaveManager';
import EnemyManager from '../services/EnemyManager';
import ConfigService from '../services/ConfigService';

const DUMMY_PATH: Vector2D[] = [
    { x: 0, y: 320 },
    { x: 160, y: 320 },
    { x: 160, y: 160 },
    { x: 480, y: 160 },
    { x: 480, y: 480 },
    { x: 800, y: 480 },
    { x: 800, y: 100 },
    { x: 1280, y: 100 },
];

export interface GameActions {
    setAppStatus: (status: AppStatus) => void;
    addGold: (amount: number) => void;
    removeHealth: (amount: number) => void;
    setWaveState: (waveState: Partial<WaveState>) => void;
    spawnEnemy: (config: EnemyTypeConfig, path: Vector2D[]) => void;
    removeEnemy: (enemyId: string) => void; // Action to remove an enemy
    updateEnemy: (enemyId: string, updates: Partial<EnemyInstance>) => void; // Action to update an enemy
    initializeGameSession: () => void;
    update: (dt: number) => void;
}

export interface GameStateWithManagers extends GameState {
    waveManager: WaveManager | null;
    enemyManager: EnemyManager | null; // Add enemy manager instance
}

const initialState: GameStateWithManagers = {
    appStatus: 'main-menu',
    gold: 200,
    health: 25,
    currentWave: 0,
    waveState: {
        waveInProgress: false,
        timeToNextWave: 10,
        spawnQueue: [],
        spawnCooldown: 0,
    },
    enemies: {},
    towers: {},
    projectiles: {},
    selectedTowerForBuild: null,
    selectedTowerInstanceId: null,
    waveManager: null,
    enemyManager: null, // Initialize as null
};

export const useGameStore = create<GameStateWithManagers & GameActions>((set, get) => ({
    ...initialState,

    setAppStatus: (status: AppStatus) => set({ appStatus: status }),
    addGold: (amount: number) => set((state) => ({ gold: state.gold + amount })),
    removeHealth: (amount: number) =>
        set((state) => ({ health: Math.max(0, state.health - amount) })),
    setWaveState: (waveState: Partial<WaveState>) => {
        set((state) => ({ waveState: { ...state.waveState, ...state.waveState, ...waveState } }));
    },
    spawnEnemy: (config: EnemyTypeConfig, path: Vector2D[]) => {
        const newEnemy: EnemyInstance = {
            id: uuidv4(),
            config,
            path,
            position: { ...path[0] },
            currentHp: config.base_stats.hp,
            pathIndex: 0,
            effects: [],
            currentSpeed: config.base_stats.speed,
            currentArmor: config.base_stats.armor,
        };
        set((state) => ({
            enemies: { ...state.enemies, [newEnemy.id]: newEnemy },
        }));
    },

    removeEnemy: (enemyId: string) => {
        set((state) => {
            const newEnemies = { ...state.enemies };
            delete newEnemies[enemyId];
            return { enemies: newEnemies };
        });
    },

    updateEnemy: (enemyId: string, updates: Partial<EnemyInstance>) => {
        set((state) => {
            const enemyToUpdate = state.enemies[enemyId];
            if (!enemyToUpdate) return {};
            const updatedEnemy = { ...enemyToUpdate, ...updates };
            const newEnemies = { ...state.enemies, [enemyId]: updatedEnemy };
            return { enemies: newEnemies };
        });
    },

    initializeGameSession: () => {
        if (!ConfigService.configs) {
            console.error('Cannot initialize game session: Configs are not loaded.');
            return;
        }
        console.log('Initializing game session and creating managers...');
        const waveManager = new WaveManager(ConfigService.configs, DUMMY_PATH);
        const enemyManager = new EnemyManager(); // EnemyManager is stateless
        set({ waveManager, enemyManager, appStatus: 'in-game' });
    },

    update: (dt: number) => {
        const { appStatus, waveManager, enemyManager } = get();
        if (appStatus !== 'in-game') return;

        if (waveManager) waveManager.update(get, set, dt);
        if (enemyManager) enemyManager.update(get, set, dt);
    },
}));
