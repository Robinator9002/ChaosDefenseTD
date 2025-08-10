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
    ProjectileInstance,
    CameraState,
} from '../types/game';
import type { EnemyTypeConfig, TowerTypeConfig } from '../types/configs';
import WaveManager from '../services/waves/WaveManager';
import EnemyManager from '../services/entities/EnemyManager';
import TowerManager from '../services/entities/TowerManager';
import ProjectileManager from '../services/entities/ProjectileManager';
import ConfigService from '../services/ConfigService';
import LevelGenerator from '../services/level_generation/LevelGenerator';

export interface GameActions {
    setAppStatus: (status: AppStatus) => void;
    addGold: (amount: number) => void;
    removeHealth: (amount: number) => void;
    setWaveState: (waveState: Partial<WaveState>) => void;
    setCameraState: (updates: Partial<CameraState>) => void;
    spawnEnemy: (config: EnemyTypeConfig, path: Vector2D[]) => void;
    removeEnemy: (enemyId: string) => void;
    updateEnemy: (enemyId: string, updates: Partial<EnemyInstance>) => void;
    damageEnemy: (enemyId: string, amount: number) => void;
    placeTower: (config: TowerTypeConfig, tile: Vector2D) => void;
    setSelectedTowerForBuild: (towerId: string | null) => void;
    spawnProjectile: (tower: TowerInstance, target: EnemyInstance) => void;
    removeProjectile: (projectileId: string) => void;
    initializeGameSession: (levelStyle: string) => void;
    update: (dt: number) => void;
}

export interface GameStateWithManagers extends GameState {
    waveManager: WaveManager | null;
    enemyManager: EnemyManager | null;
    towerManager: TowerManager | null;
    projectileManager: ProjectileManager | null;
}

const initialState: GameStateWithManagers = {
    appStatus: 'main-menu',
    gold: 200,
    health: 25,
    currentWave: 0,
    waveState: { waveInProgress: false, timeToNextWave: 10, spawnQueue: [], spawnCooldown: 0 },
    enemies: {},
    towers: {},
    projectiles: {},
    selectedTowerForBuild: null,
    selectedTowerInstanceId: null,
    waveManager: null,
    enemyManager: null,
    towerManager: null,
    projectileManager: null,
    grid: null,
    paths: null,
    levelStyle: null,
    camera: {
        offset: { x: 0, y: 0 },
        zoom: 1.0,
    },
};

export const useGameStore = create<GameStateWithManagers & GameActions>((set, get) => ({
    ...initialState,

    // --- Actions ---
    setAppStatus: (status) => set({ appStatus: status }),
    addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
    removeHealth: (amount) => set((state) => ({ health: Math.max(0, state.health - amount) })),
    setWaveState: (waveState) =>
        set((state) => ({ waveState: { ...state.waveState, ...waveState } })),
    setCameraState: (updates) =>
        set((state) => ({
            camera: { ...state.camera, ...updates },
        })),

    spawnEnemy: (config, path) => {
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
        set((state) => ({ enemies: { ...state.enemies, [newEnemy.id]: newEnemy } }));
    },

    removeEnemy: (enemyId) =>
        set((state) => {
            const newEnemies = { ...state.enemies };
            delete newEnemies[enemyId];
            return { enemies: newEnemies };
        }),

    updateEnemy: (enemyId, updates) =>
        set((state) => {
            const enemy = state.enemies[enemyId];
            if (!enemy) return {};
            return { enemies: { ...state.enemies, [enemyId]: { ...enemy, ...updates } } };
        }),

    damageEnemy: (enemyId, amount) =>
        set((state) => {
            const enemy = state.enemies[enemyId];
            if (!enemy) return {};
            const newHp = enemy.currentHp - amount;
            if (newHp <= 0) {
                const newEnemies = { ...state.enemies };
                delete newEnemies[enemyId];
                return { enemies: newEnemies, gold: state.gold + enemy.config.base_stats.bounty };
            }
            return { enemies: { ...state.enemies, [enemyId]: { ...enemy, currentHp: newHp } } };
        }),

    placeTower: (config, tile) => {
        const newTower: TowerInstance = {
            id: uuidv4(),
            config,
            tilePosition: tile,
            cooldown: 0,
            currentPersona: 'EXECUTIONER',
            appliedUpgradeIds: [],
            totalInvestment: config.cost,
            currentDamage: config.attack?.data.damage ?? 0,
            currentRange: config.attack?.data.range ?? 0,
            currentFireRate: config.attack?.data.fire_rate ?? 0,
        };
        set((state) => ({
            towers: { ...state.towers, [newTower.id]: newTower },
            gold: state.gold - config.cost,
        }));
    },

    setSelectedTowerForBuild: (towerId) =>
        set((state) => {
            if (state.selectedTowerForBuild === towerId) {
                return { selectedTowerForBuild: null };
            }
            return { selectedTowerForBuild: towerId };
        }),

    spawnProjectile: (tower, target) => {
        if (!tower.config.attack) return;
        const TILE_SIZE = ConfigService.configs?.gameSettings.tile_size ?? 32;
        const newProjectile: ProjectileInstance = {
            id: uuidv4(),
            position: {
                x: tower.tilePosition.x * TILE_SIZE + TILE_SIZE / 2,
                y: tower.tilePosition.y * TILE_SIZE + TILE_SIZE / 2,
            },
            targetId: target.id,
            speed: 500,
            damage: tower.currentDamage,
            blastRadius: tower.config.attack.data.blast_radius,
        };
        set((state) => ({
            projectiles: { ...state.projectiles, [newProjectile.id]: newProjectile },
        }));
    },

    removeProjectile: (projectileId) =>
        set((state) => {
            const newProjectiles = { ...state.projectiles };
            delete newProjectiles[projectileId];
            return { projectiles: newProjectiles };
        }),

    initializeGameSession: (levelStyle) => {
        const configs = ConfigService.configs;
        if (!configs) return;

        const generationResult = LevelGenerator.generateLevel(levelStyle);
        if (!generationResult || generationResult.paths.length === 0) {
            console.error(
                `Failed to initialize game session: Could not generate level "${levelStyle}"`,
            );
            return;
        }

        const { grid, paths } = generationResult;

        // --- FIX: Pass all generated paths to the WaveManager ---
        const waveManager = new WaveManager(configs, paths);
        const enemyManager = new EnemyManager();
        const towerManager = new TowerManager();
        const projectileManager = new ProjectileManager();

        set({
            ...initialState,
            grid,
            paths,
            levelStyle,
            waveManager,
            enemyManager,
            towerManager,
            projectileManager,
            appStatus: 'in-game',
        });
    },

    update: (dt) => {
        const { appStatus, waveManager, enemyManager, towerManager, projectileManager } = get();
        if (appStatus !== 'in-game') return;

        // Note: The order of updates can matter.
        // For example, updating towers first allows them to fire at the previous frame's enemy positions.
        towerManager?.update(get, set, dt);
        projectileManager?.update(get, set, dt);
        enemyManager?.update(get, set, dt);
        waveManager?.update(get, set, dt);
    },
}));
