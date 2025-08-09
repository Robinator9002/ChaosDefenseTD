// src/types/game.d.ts

import type { EnemyTypeConfig, TowerTypeConfig, UpgradeConfig } from './configs';

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
    sourceTowerId: string; // To prevent re-application from the same source if stacking is 'refresh'
}

// =================================================================
// Entity Instance Types
// =================================================================

/** Represents a single, live enemy on the game grid. */
export interface EnemyInstance {
    id: string; // A unique UUID for this specific instance
    config: EnemyTypeConfig;
    position: Vector2D;
    currentHp: number;
    path: Vector2D[];
    pathIndex: number;
    effects: ActiveStatusEffect[];
    // Calculated stats after scaling and effects
    currentSpeed: number;
    currentArmor: number;
}

/** Represents a single, live tower placed on the game grid. */
export interface TowerInstance {
    id: string; // A unique UUID for this specific instance
    config: TowerTypeConfig;
    tilePosition: Vector2D; // The {x, y} grid tile it's on
    cooldown: number; // Time remaining until it can fire again
    currentPersona: string;
    appliedUpgradeIds: string[];
    totalInvestment: number; // For salvage calculations
    // Calculated stats after upgrades
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

/** Defines the structure for the main Zustand store. */
export interface GameState {
    appStatus: AppStatus;

    // In-game resources
    gold: number;
    health: number;
    currentWave: number;

    // Live entities
    enemies: Record<string, EnemyInstance>; // Use object for faster lookups
    towers: Record<string, TowerInstance>;
    projectiles: Record<string, ProjectileInstance>;

    // UI State
    selectedTowerForBuild: string | null; // The key from tower_types.json
    selectedTowerInstanceId: string | null; // The UUID of a placed tower
}
