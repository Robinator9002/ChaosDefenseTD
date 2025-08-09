// src/services/WaveManager.ts

import type { GameState, Vector2D } from '../../types/game';
// FIX: Correctly import AllConfigs from its definitive source: ../types/configs
import type { AllConfigs } from '../../types/configs';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for enemy waves, including timing, composition,
 * and spawning. It reads from the game state and configs and dispatches
 * actions back to the store.
 */
class WaveManager {
    // Declare configs as potentially null, matching ConfigService's public property
    private configs: AllConfigs | null;
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
        // Add a runtime type guard to ensure 'configs' is not null
        if (!this.configs) {
            console.error('WaveManager: Configuration not initialized. Skipping update.');
            return;
        }
        // TypeScript now knows 'currentConfigs' is definitely AllConfigs
        const currentConfigs: AllConfigs = this.configs;

        const { waveState } = get();

        if (waveState.waveInProgress) {
            this.handleSpawning(get, set, dt, currentConfigs);
        } else {
            this.handleWaveCountdown(get, set, dt, currentConfigs);
        }
    }

    private handleWaveCountdown(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
        configs: AllConfigs, // Receive configs as a non-nullable parameter
    ): void {
        const { timeToNextWave } = get().waveState;
        const newTimeToNextWave = timeToNextWave - dt;

        set((state) => ({
            waveState: { ...state.waveState, timeToNextWave: newTimeToNextWave },
        }));

        if (newTimeToNextWave <= 0) {
            this.startNextWave(get, set, configs);
        }
    }

    private handleSpawning(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
        configs: AllConfigs, // Receive configs as a non-nullable parameter
    ): void {
        const { spawnQueue, spawnCooldown } = get().waveState;
        const currentWave = get().currentWave;
        const levelDifficulty = configs.gameSettings.difficulty;

        if (spawnQueue.length === 0) {
            if (Object.keys(get().enemies).length === 0) {
                console.log(`Wave ${currentWave} complete!`);
                const difficultyKey = String(configs.gameSettings.difficulty);
                const timeBetweenWaves =
                    configs.difficultyScaling[difficultyKey]?.time_between_waves || 0;

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
            const enemyConfig = configs.enemyTypes[enemyIdToSpawn];

            if (enemyConfig) {
                get().spawnEnemy(enemyConfig, this.mainPath);
            }

            const { waveScaling } = configs;

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
            if (newSpawnCooldown !== spawnCooldown) {
                set((state) => ({
                    waveState: { ...state.waveState, spawnCooldown: newSpawnCooldown },
                }));
            }
        }
    }

    private startNextWave(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        configs: AllConfigs, // Receive configs as a non-nullable parameter
    ): void {
        const newWaveNumber = get().currentWave + 1;
        console.log(`Starting Wave ${newWaveNumber}`);

        const { waveScaling, enemyTypes } = configs;
        const levelDifficulty = configs.gameSettings.difficulty;

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
