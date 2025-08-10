// src/types/game.d.ts

import type { EnemyTypeConfig, TowerTypeConfig, StatusEffectValue } from './configs';
import type { Grid } from '../services/level_generation/Grid';

/**
 * This file contains TypeScript interfaces for the dynamic, in-game state.
 * These types represent live entities like enemies and towers, and the
 * overall state of the game session managed by Zustand.
 */

// =================================================================
// Core & Utility Types
// =================================================================

export interface Vector2D {
    x: number;
    y: number;
}

export interface CameraState {
    offset: Vector2D;
    zoom: number;
}

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

export interface TowerInstance {
    id: string;
    config: TowerTypeConfig;
    tilePosition: Vector2D;
    cooldown: number;
    currentPersona: string;
    appliedUpgradeIds: string[];
    totalInvestment: number;
    // Base combat stats that are recalculated with buffs/upgrades
    currentDamage: number;
    currentRange: number;
    currentFireRate: number;
    // --- NEW: Add pierce and chain stats ---
    currentPierce?: number;
    currentChains?: number;
}

/**
 * Represents a single projectile in flight.
 * ENHANCED: Now supports piercing and chaining mechanics.
 */
export interface ProjectileInstance {
    id: string;
    position: Vector2D;
    targetId: string;
    speed: number;
    damage: number;
    blastRadius?: number;
    effectsToApply?: StatusEffectValue[];
    // --- NEW: Advanced projectile properties ---
    pierce?: number; // How many enemies it can pass through
    chains?: number; // How many times it can jump to a new target
    hitEnemyIds: string[]; // Tracks which enemies have already been hit by this projectile
}

/**
 * NEW: Represents a persistent area on the ground, like a firewall.
 */
export interface AuraInstance {
    id: string;
    sourceTowerId: string;
    position: Vector2D;
    radius: number;
    duration: number;
    timeRemaining: number;
    effects: Record<string, StatusEffectValue>; // Effects applied to enemies inside
    dps: number; // Direct damage per second
}

// =================================================================
// Game State & Store
// =================================================================

export type AppStatus =
    | 'main-menu'
    | 'workshop'
    | 'level-select'
    | 'in-game'
    | 'paused'
    | 'game-over'
    | 'victory';

export interface WaveState {
    waveInProgress: boolean;
    timeToNextWave: number;
    spawnQueue: string[];
    spawnCooldown: number;
}

export interface GameState {
    appStatus: AppStatus;
    gold: number;
    health: number;
    currentWave: number;

    // Live entities
    enemies: Record<string, EnemyInstance>;
    towers: Record<string, TowerInstance>;
    projectiles: Record<string, ProjectileInstance>;
    auras: Record<string, AuraInstance>;

    // UI State
    selectedTowerForBuild: string | null;
    selectedTowerInstanceId: string | null;

    // Wave Management State
    waveState: WaveState;

    // Level Data
    grid: Grid | null;
    paths: Vector2D[][] | null;
    levelStyle: string | null;

    // Camera State
    camera: CameraState;
}
