// src/types/game.d.ts

import type { EnemyTypeConfig, TowerTypeConfig } from './configs';
import type { Grid } from '../services/level_generation/Grid'; // Import the Grid class type

/**
 * This file contains TypeScript interfaces for the dynamic, in-game state.
 * These types represent live entities like enemies and towers, and the
 * overall state of the game session managed by Zustand.
 */

// =================================================================
// Core & Utility Types
// =================================================================

/** A simple 2D vector for positions and velocities. */
export interface Vector2D {
    x: number;
    y: number;
}

/** Represents an active status effect on an entity. */
export interface ActiveStatusEffect {
    id: string;
    potency: number;
    duration: number;
    timeRemaining: number;
    sourceTowerId: string;
}

// =================================================================
// Entity Instance Types
// =================================================================

/** Represents a single, live enemy on the game grid. */
export interface EnemyInstance {
    id: string;
    config: EnemyTypeConfig;
    position: Vector2D;
    currentHp: number;
    path: Vector2D[];
    pathIndex: number;
    effects: ActiveStatusEffect[];
    currentSpeed: number;
    currentArmor: number;
}

/** Represents a single, live tower placed on the game grid. */
export interface TowerInstance {
    id: string;
    config: TowerTypeConfig;
    tilePosition: Vector2D;
    cooldown: number;
    currentPersona: string;
    appliedUpgradeIds: string[];
    totalInvestment: number;
    currentDamage: number;
    currentRange: number;
    currentFireRate: number;
}

/** Represents a single projectile in flight. */
export interface ProjectileInstance {
    id: string;
    position: Vector2D;
    targetId: string;
    speed: number;
    damage: number;
    blastRadius?: number;
    effectsToApply?: StatusEffectValue[];
}

// =================================================================
// Game State & Store
// =================================================================

/** Defines the possible states of the overall application. */
export type AppStatus =
    | 'main-menu'
    | 'workshop'
    | 'level-select'
    | 'in-game'
    | 'paused'
    | 'game-over'
    | 'victory';

/** Defines the state related to wave spawning and timing. */
export interface WaveState {
    waveInProgress: boolean;
    timeToNextWave: number;
    spawnQueue: string[]; // Array of enemy type IDs to spawn
    spawnCooldown: number;
}

/** Defines the structure for the main Zustand store. */
export interface GameState {
    appStatus: AppStatus;

    // In-game resources
    gold: number;
    health: number;
    currentWave: number;

    // Live entities
    enemies: Record<string, EnemyInstance>;
    towers: Record<string, TowerInstance>;
    projectiles: Record<string, ProjectileInstance>;

    // UI State
    selectedTowerForBuild: string | null;
    selectedTowerInstanceId: string | null;

    // Wave Management State
    waveState: WaveState;

    // --- NEW: Level Data ---
    grid: Grid | null;
    paths: Vector2D[][] | null;
    levelStyle: string | null;
}
