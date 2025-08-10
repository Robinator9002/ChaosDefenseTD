// src/services/waves/WaveManager.ts

import type { GameState, Vector2D } from '../../types/game';
import type { AllConfigs } from '../../types/configs';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for enemy waves, including timing, composition,
 * and spawning across multiple paths.
 */
class WaveManager {
    private configs: AllConfigs;
    // --- FIX: Store all available paths, not just one ---
    private paths: Vector2D[][];

    constructor(configs: AllConfigs, paths: Vector2D[][]) {
        if (!configs) {
            throw new Error('WaveManager requires a valid configuration object.');
        }
        if (!paths || paths.length === 0) {
            throw new Error('WaveManager requires at least one path to be provided.');
        }
        this.configs = configs;
        this.paths = paths;
    }

    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { waveState } = get();

        if (waveState.waveInProgress) {
            this.handleSpawning(get, set, dt);
        } else {
            this.handleWaveCountdown(get, set, dt);
        }
    }

    private handleWaveCountdown(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { timeToNextWave } = get().waveState;
        const newTimeToNextWave = timeToNextWave - dt;

        set((state) => ({
            waveState: { ...state.waveState, timeToNextWave: newTimeToNextWave },
        }));

        if (newTimeToNextWave <= 0) {
            this.startNextWave(get, set);
        }
    }

    private handleSpawning(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { spawnQueue, spawnCooldown } = get().waveState;
        const currentWave = get().currentWave;
        const levelDifficulty = this.configs.gameSettings.difficulty;

        if (spawnQueue.length === 0) {
            if (Object.keys(get().enemies).length === 0) {
                console.log(`Wave ${currentWave} complete!`);
                const difficultyKey = String(this.configs.gameSettings.difficulty);
                const timeBetweenWaves =
                    this.configs.difficultyScaling[difficultyKey]?.time_between_waves || 15;

                set((state) => ({
                    waveState: {
                        ...state.waveState,
                        waveInProgress: false,
                        timeToNextWave: timeBetweenWaves,
                    },
                }));
            }
            return;
        }

        const newSpawnCooldown = spawnCooldown - dt;
        if (newSpawnCooldown <= 0) {
            const enemyIdToSpawn = spawnQueue[0];
            const enemyConfig = this.configs.enemyTypes[enemyIdToSpawn];

            if (enemyConfig) {
                // --- FIX: Randomly select a path for the new enemy ---
                const chosenPath = this.paths[Math.floor(Math.random() * this.paths.length)];
                get().spawnEnemy(enemyConfig, chosenPath);
            }

            const { waveScaling } = this.configs;
            const calculatedSpawnCooldown = Math.max(
                waveScaling.spawn_cooldown.minimum_seconds,
                waveScaling.spawn_cooldown.base_seconds -
                    waveScaling.spawn_cooldown.reduction_per_wave * currentWave -
                    waveScaling.spawn_cooldown.reduction_per_level_difficulty * levelDifficulty,
            );

            set((state) => ({
                waveState: {
                    ...state.waveState,
                    spawnQueue: state.waveState.spawnQueue.slice(1),
                    spawnCooldown: calculatedSpawnCooldown,
                },
            }));
        } else {
            set((state) => ({
                waveState: { ...state.waveState, spawnCooldown: newSpawnCooldown },
            }));
        }
    }

    private startNextWave(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
    ): void {
        const newWaveNumber = get().currentWave + 1;
        console.log(`Starting Wave ${newWaveNumber}`);

        const { waveScaling, enemyTypes } = this.configs;
        const levelDifficulty = this.configs.gameSettings.difficulty;

        const enemyCount = Math.floor(
            waveScaling.enemy_count.base +
                waveScaling.enemy_count.per_wave * newWaveNumber +
                waveScaling.enemy_count.per_level_difficulty * levelDifficulty,
        );

        const spawnQueue: string[] = [];
        const availableEnemies = Object.keys(enemyTypes).filter(
            (id) => enemyTypes[id].min_level_difficulty <= levelDifficulty,
        );

        if (availableEnemies.length === 0) {
            console.error('No available enemies for the current difficulty level!');
            return;
        }

        for (let i = 0; i < enemyCount; i++) {
            const randomEnemyId =
                availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            spawnQueue.push(randomEnemyId);
        }

        set((state) => ({
            currentWave: newWaveNumber,
            waveState: {
                ...state.waveState,
                waveInProgress: true,
                spawnQueue: spawnQueue,
                spawnCooldown: 0,
            },
        }));
    }
}

export default WaveManager;
