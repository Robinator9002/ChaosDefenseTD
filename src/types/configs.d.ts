// src/types/configs.d.ts

/**
 * This file contains TypeScript interfaces for all static configuration
 * files loaded from the `src/configs` directory. Defining these types
 * ensures that our data is consistent and provides excellent autocompletion
 * and error-checking throughout the project.
 */

// =================================================================
// Reusable Sub-Types
// =================================================================

export interface InfoPanelStat {
    label: string;
    value_path: string;
    format?: 'per_second' | 'percentage' | 'multiplier' | 'percentage_boost';
    description?: string;
}

export interface StatusEffectValue {
    id: string;
    potency: number;
    duration: number;
}

// =================================================================
// Tower Configurations
// =================================================================

export interface TowerAttack {
    type: 'standard_projectile' | 'persistent_ground_aura' | 'persistent_attached_aura';
    data: {
        damage?: number;
        dps?: number;
        range: number;
        fire_rate: number;
        blast_radius?: number;
        radius?: number;
        duration?: number;
        tick_rate?: number;
        bonus_damage_vs_armor_multiplier?: number;
        effects?: Record<string, StatusEffectValue>;
        on_blast_effects?: StatusEffectValue[];
    };
}

export interface TowerAura {
    range: number;
    target_type: 'TOWER';
    effects: Record<string, { potency: number; duration: number }>;
}

export interface TowerTypeConfig {
    name: string;
    category: 'military' | 'elemental' | 'artillery' | 'magic' | 'support';
    cost: number;
    unlock_cost?: number;
    description: string;
    sprite_key: string;
    placeholder_color: [number, number, number];
    info_panel_stats: InfoPanelStat[];
    attack?: TowerAttack;
    auras?: TowerAura[];
    special_properties?: {
        minimum_range?: number;
    };
}

export interface UpgradeEffect {
    type: 'add_damage' | 'add_range' | 'multiply_fire_rate' | 'add_blast_effect';
    value: number | StatusEffectValue;
}

export interface UpgradeConfig {
    id: string;
    name: string;
    cost: number;
    description: string;
    path: 'a' | 'b';
    effects: UpgradeEffect[];
}

export interface UpgradePath {
    name: string;
    description: string;
    upgrades: UpgradeConfig[];
}

export interface TowerUpgradeFile {
    path_a: UpgradePath;
    path_b: UpgradePath;
}

// =================================================================
// Enemy & AI Configurations
// =================================================================

export interface EnemyRenderProps {
    size: number;
    color: [number, number, number];
}

export interface EnemyBaseStats {
    hp: number;
    speed: number;
    bounty: number;
    damage: number;
    armor: number;
    immunities?: string[];
}

export interface EnemyScaling {
    hp?: number;
    speed?: number;
    bounty?: number;
    armor?: number;
}

export interface EnemyTypeConfig {
    name: string;
    min_level_difficulty: number;
    render_props: EnemyRenderProps;
    base_stats: EnemyBaseStats;
    scaling_per_level_add: EnemyScaling;
}

export interface TargetingPersona {
    name: string;
    description: string;
    priority_function: string;
}

// =================================================================
// Gameplay & Level Configurations
// =================================================================

export interface GameSettings {
    screen_width: number;
    screen_height: number;
    screen_title: string;
    tile_size: number;
    difficulty: number;
    initial_chaos_shards: number;
    initial_unlocked_towers: string[];
}

export interface GlobalUpgrade {
    name: string;
    cost: number;
    description: string;
    effects: {
        type: 'modify_game_state' | 'modify_tower_stat';
        value: {
            stat: string;
            amount: number;
            tower_id?: string;
        };
    }[];
}

export interface LevelGenerationParams {
    grid_width: number;
    grid_height: number;
    description: string;
    paths_config: Record<string, number>;
    level_difficulty: number;
    starting_gold: number;
    base_hp: number;
    allowed_boss_types: string[];
    features: Record<string, { min: number; max: number }>;
}

export interface TileDefinition {
    color: [number, number, number];
    sprite: string;
}

export interface LevelStyleConfig {
    background_color: [number, number, number];
    generation_params: LevelGenerationParams;
    tile_definitions: Record<string, TileDefinition>;
}

// --- NEW: Specific types for scaling configs ---
export interface WaveScalingConfig {
    enemy_count: {
        base: number;
        per_wave: number;
        per_level_difficulty: number;
    };
    spawn_cooldown: {
        base_seconds: number;
        reduction_per_wave: number;
        reduction_per_level_difficulty: number;
        minimum_seconds: number;
    };
}

export interface DifficultySetting {
    name: string;
    stat_modifier: number;
    time_between_waves: number;
    max_waves: number;
    level_difficulty_increase_interval: number;
    salvage_refund_percentage: number;
}

export type DifficultyScalingConfig = Record<string, DifficultySetting>;

// --- NEW: Stricter AllConfigs type ---
/**
 * Defines the final, structured shape of all loaded configuration data.
 * This is now a strict interface, ensuring type safety when accessing configs.
 */
export interface AllConfigs {
    towerTypes: Record<string, TowerTypeConfig>;
    towerUpgrades: Record<string, TowerUpgradeFile>;
    enemyTypes: Record<string, EnemyTypeConfig>;
    gameSettings: GameSettings;
    globalUpgrades: Record<string, GlobalUpgrade>;
    levelStyles: Record<string, LevelStyleConfig>;
    targetingAi: Record<string, TargetingPersona>;
    difficultyScaling: DifficultyScalingConfig;
    waveScaling: WaveScalingConfig;
    statusEffects: Record<string, unknown>; // Define more strictly if needed
    formations: Record<string, unknown>; // Define more strictly if needed
}
