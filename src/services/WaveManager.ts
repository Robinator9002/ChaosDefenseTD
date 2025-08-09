// src/services/WaveManager.ts

import type { GameState, Vector2D } from '../types/game';
import type { AllConfigs } from './ConfigService';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../state/gameStore'; // We'll need this type soon

// A helper type for the Zustand store to avoid circular dependencies
type GameStore = GameState & GameActions;

/**
 * Manages the logic for enemy waves, including timing, composition,
 * and spawning. It reads from the game state and configs and dispatches
 * actions back to the store.
 */
class WaveManager {
    private configs: AllConfigs;
    private mainPath: Vector2D[]; // The path enemies will follow

    constructor(configs: AllConfigs, mainPath: Vector2D[]) {
        if (!configs) {
            throw new Error('WaveManager requires a valid configuration object.');
        }
        this.configs = configs;
        this.mainPath = mainPath;
    }

    /**
     * The main update function for the wave manager, called on every game tick.
     * @param get A function to get the current state from the Zustand store.
     * @param set A function to set the state in the Zustand store.
     * @param dt Delta time since the last frame.
     */
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { waveState, currentWave } = get();

        if (waveState.waveInProgress) {
            this.handleSpawning(get, set, dt);
        } else {
            this.handleWaveCountdown(get, set, dt);
        }
    }

    /**
     * Handles the countdown timer between waves.
     */
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
            set((state: any) => ({
                waveState: { ...state.waveState, timeToNextWave: newTimeToNextWave },
            }));
        }
    }

    /**
     * Handles the spawning of enemies from the queue during an active wave.
     */
    private handleSpawning(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { spawnQueue, spawnCooldown } = get().waveState;

        if (spawnQueue.length === 0) {
            // If queue is empty and all enemies are defeated, the wave ends.
            // We'll add the "all enemies defeated" check in the EnemyManager.
            // For now, let's assume the wave ends when the queue is empty.
            if (Object.keys(get().enemies).length === 0) {
                console.log(`Wave ${get().currentWave} complete!`);
                set((state: any) => ({
                    waveState: {
                        ...state.waveState,
                        waveInProgress: false,
                        timeToNextWave: this.configs.difficultyScaling['1'].time_between_waves, // Reset timer
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

            // Reset cooldown and remove the spawned enemy from the queue
            const { waveScaling } = this.configs;
            const nextCooldown = waveScaling.spawn_cooldown.base_seconds; // Simplified for now
            set((state: any) => ({
                waveState: {
                    ...state.waveState,
                    spawnQueue: state.waveState.spawnQueue.slice(1),
                    spawnCooldown: nextCooldown,
                },
            }));
        } else {
            set((state: any) => ({
                waveState: { ...state.waveState, spawnCooldown: newSpawnCooldown },
            }));
        }
    }

    /**
     * Composes and initiates the next wave of enemies.
     */
    private startNextWave(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
    ): void {
        const newWaveNumber = get().currentWave + 1;
        console.log(`Starting Wave ${newWaveNumber}`);

        const { waveScaling, enemyTypes } = this.configs;
        const levelDifficulty = 1; // Placeholder for now

        // Calculate how many enemies to spawn this wave
        const enemyCount = Math.floor(
            waveScaling.enemy_count.base +
                waveScaling.enemy_count.per_wave * newWaveNumber +
                waveScaling.enemy_count.per_level_difficulty * levelDifficulty,
        );

        // Create the spawn queue
        const spawnQueue: string[] = [];
        const availableEnemies = Object.keys(enemyTypes).filter(
            (id) => enemyTypes[id].min_level_difficulty <= levelDifficulty,
        );

        for (let i = 0; i < enemyCount; i++) {
            // Simple random selection for now
            const randomEnemyId =
                availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            spawnQueue.push(randomEnemyId);
        }

        set((state: any) => ({
            currentWave: newWaveNumber,
            waveState: {
                ...state.waveState,
                waveInProgress: true,
                spawnQueue: spawnQueue,
                spawnCooldown: 0, // Start spawning immediately
            },
        }));
    }
}

export default WaveManager;
