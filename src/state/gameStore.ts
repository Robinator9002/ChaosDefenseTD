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
} from '../types/game';
import type { EnemyTypeConfig, TowerTypeConfig } from '../types/configs';
import WaveManager from '../services/WaveManager';
import EnemyManager from '../services/entities/EnemyManager';
import TowerManager from '../services/entities/TowerManager';
import ProjectileManager from '../services/entities/ProjectileManager';
import ConfigService from '../services/ConfigService';

const TILE_SIZE = 32;
const DUMMY_PATH: Vector2D[] = [
    { x: 0 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 5 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 15 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 15 * TILE_SIZE, y: 15 * TILE_SIZE },
    { x: 25 * TILE_SIZE, y: 15 * TILE_SIZE },
    { x: 25 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 40 * TILE_SIZE, y: 3 * TILE_SIZE },
];

export interface GameActions {
    setAppStatus: (status: AppStatus) => void;
    addGold: (amount: number) => void;
    removeHealth: (amount: number) => void;
    setWaveState: (waveState: Partial<WaveState>) => void;
    // Enemy Actions
    spawnEnemy: (config: EnemyTypeConfig, path: Vector2D[]) => void;
    removeEnemy: (enemyId: string) => void;
    updateEnemy: (enemyId: string, updates: Partial<EnemyInstance>) => void;
    damageEnemy: (enemyId: string, amount: number) => void;
    // Tower Actions
    placeTower: (config: TowerTypeConfig, tile: Vector2D) => void;
    setSelectedTowerForBuild: (towerId: string | null) => void; // New action
    // Projectile Actions
    spawnProjectile: (tower: TowerInstance, target: EnemyInstance) => void;
    removeProjectile: (projectileId: string) => void;
    // Session
    initializeGameSession: () => void;
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
};

export const useGameStore = create<GameStateWithManagers & GameActions>((set, get) => ({
    ...initialState,

    // --- Actions ---
    setAppStatus: (status) => set({ appStatus: status }),
    addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
    removeHealth: (amount) => set((state) => ({ health: Math.max(0, state.health - amount) })),
    setWaveState: (waveState) =>
        set((state) => ({ waveState: { ...state.waveState, ...waveState } })),

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
            currentPersona: 'SOLDIER',
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
            // If clicking the same tower again, deselect it.
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

    initializeGameSession: () => {
        const configs = ConfigService.configs;
        if (!configs) return;
        const waveManager = new WaveManager(configs, DUMMY_PATH);
        const enemyManager = new EnemyManager();
        const towerManager = new TowerManager();
        const projectileManager = new ProjectileManager();
        set({ waveManager, enemyManager, towerManager, projectileManager, appStatus: 'in-game' });
    },

    update: (dt) => {
        const { appStatus, waveManager, enemyManager, towerManager, projectileManager } = get();
        if (appStatus !== 'in-game') return;

        towerManager?.update(get, set, dt);
        projectileManager?.update(get, set, dt);
        enemyManager?.update(get, set, dt);
        waveManager?.update(get, set, dt);
    },
}));
