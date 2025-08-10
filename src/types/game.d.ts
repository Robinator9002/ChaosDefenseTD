// src/types/game.d.ts

import type { EnemyTypeConfig, TowerTypeConfig, StatusEffectValue } from './configs';
import type { Grid } from '../services/level_generation/Grid';

// Core & Utility Types remain the same...
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

// Entity Instance Types
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
    currentDamage: number;
    currentRange: number;
    currentFireRate: number;
    currentPierce?: number;
    currentChains?: number;
}

/**
 * Represents a single projectile in flight.
 */
export interface ProjectileInstance {
    id: string;
    sourceTowerId: string; // <-- FIX: Added source tower ID
    position: Vector2D;
    targetId: string;
    speed: number;
    damage: number;
    blastRadius?: number;
    effectsToApply?: StatusEffectValue[];
    onBlastEffects?: StatusEffectValue[]; // <-- FIX: Added on-blast effects
    pierce?: number;
    chains?: number;
    hitEnemyIds: string[];
}

export interface AuraInstance {
    id: string;
    sourceTowerId: string;
    position: Vector2D;
    radius: number;
    duration: number;
    timeRemaining: number;
    effects: Record<string, StatusEffectValue>;
    dps: number;
}

// Game State & Store types remain the same...
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
    enemies: Record<string, EnemyInstance>;
    towers: Record<string, TowerInstance>;
    projectiles: Record<string, ProjectileInstance>;
    auras: Record<string, AuraInstance>;
    selectedTowerForBuild: string | null;
    selectedTowerInstanceId: string | null;
    waveState: WaveState;
    grid: Grid | null;
    paths: Vector2D[][] | null;
    levelStyle: string | null;
    camera: CameraState;
}
