// src/services/WaveManager.ts

import type { GameState, Vector2D } from '../types/game';
import type { AllConfigs } from './ConfigService';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for enemy waves, including timing, composition,
 * and spawning. It reads from the game state and configs and dispatches
 * actions back to the store.
 */
class WaveManager {
    private configs: AllConfigs;
    private mainPath: Vector2D[];

    constructor(configs: AllConfigs, mainPath: Vector2D[]) {
        if (!configs) {
            throw new Error('WaveManager requires a valid configuration object.');
        }
        this.configs = configs;
        this.mainPath = mainPath;
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

        if (newTimeToNextWave <= 0) {
            this.startNextWave(get, set);
        } else {
            set((state) => ({
                waveState: { ...state.waveState, timeToNextWave: newTimeToNextWave },
            }));
        }
    }

    private handleSpawning(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { spawnQueue, spawnCooldown } = get().waveState;

        if (spawnQueue.length === 0) {
            if (Object.keys(get().enemies).length === 0) {
                console.log(`Wave ${get().currentWave} complete!`);
                const difficulty = String(this.configs.gameSettings.difficulty);
                const timeBetweenWaves =
                    this.configs.difficultyScaling[difficulty].time_between_waves;

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
                get().spawnEnemy(enemyConfig, this.mainPath);
            }

            const { waveScaling } = this.configs;
            const nextCooldown = waveScaling.spawn_cooldown.base_seconds;
            set((state) => ({
                waveState: {
                    ...state.waveState,
                    spawnQueue: state.waveState.spawnQueue.slice(1),
                    spawnCooldown: nextCooldown,
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
        const levelDifficulty = 1;

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
