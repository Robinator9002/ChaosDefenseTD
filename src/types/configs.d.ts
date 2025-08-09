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

/** Defines a single stat line displayed in a tower's info panel. */
export interface InfoPanelStat {
    label: string;
    value_path: string;
    format?: 'per_second' | 'percentage' | 'multiplier' | 'percentage_boost';
    description?: string;
}

/** Defines a status effect that can be applied by a tower or enemy. */
export interface StatusEffectValue {
    id: string;
    potency: number;
    duration: number;
}

// =================================================================
// Tower Configurations (`tower_types.json`, `upgrades/towers/*.json`)
// =================================================================

/** Defines the attack properties of a tower. */
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

/** Defines an aura emitted by a support tower. */
export interface TowerAura {
    range: number;
    target_type: 'TOWER';
    effects: Record<string, { potency: number; duration: number }>;
}

/** Defines the structure for a single tower type in `tower_types.json`. */
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

/** Defines a single upgrade effect within an upgrade's `effects` array. */
export interface UpgradeEffect {
    type: 'add_damage' | 'add_range' | 'multiply_fire_rate' | 'add_blast_effect';
    value: number | StatusEffectValue;
}

/** Defines a single upgrade within a path. */
export interface UpgradeConfig {
    id: string;
    name: string;
    cost: number;
    description: string;
    path: 'a' | 'b';
    effects: UpgradeEffect[];
}

/** Defines a single upgrade path (e.g., "path_a"). */
export interface UpgradePath {
    name: string;
    description: string;
    upgrades: UpgradeConfig[];
}

/** Defines the structure of a complete tower upgrade file (e.g., `mortar.json`). */
export interface TowerUpgradeFile {
    path_a: UpgradePath;
    path_b: UpgradePath;
}

// =================================================================
// Enemy & AI Configurations (`enemy_types.json`, `formations.json`, `targeting_ai.json`)
// =================================================================

/** Defines the visual properties of an enemy. */
export interface EnemyRenderProps {
    size: number;
    color: [number, number, number];
}

/** Defines the base stats for an enemy type. */
export interface EnemyBaseStats {
    hp: number;
    speed: number;
    bounty: number;
    damage: number;
    armor: number;
    immunities?: string[];
}

/** Defines the additive stat scaling per level for an enemy. */
export interface EnemyScaling {
    hp?: number;
    speed?: number;
    bounty?: number;
    armor?: number;
}

/** Defines the structure for a single enemy type in `enemy_types.json`. */
export interface EnemyTypeConfig {
    name: string;
    min_level_difficulty: number;
    render_props: EnemyRenderProps;
    base_stats: EnemyBaseStats;
    scaling_per_level_add: EnemyScaling;
}

/** Defines a single AI targeting persona from `targeting_ai.json`. */
export interface TargetingPersona {
    name: string;
    description: string;
    priority_function: string;
}

// =================================================================
// Gameplay & Level Configurations
// =================================================================

/** Defines the structure for `game_settings.json`. */
export interface GameSettings {
    screen_width: number;
    screen_height: number;
    screen_title: string;
    tile_size: number;
    difficulty: number;
    initial_chaos_shards: number;
    initial_unlocked_towers: string[];
}

/** Defines a single global upgrade from `global_upgrades.json`. */
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

/** Defines the generation parameters for a level style. */
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

/** Defines a single tile type within a level's style. */
export interface TileDefinition {
    color: [number, number, number];
    sprite: string;
}

/** Defines the structure of a single level style in `level_styles.json`. */
export interface LevelStyleConfig {
    background_color: [number, number, number];
    generation_params: LevelGenerationParams;
    tile_definitions: Record<string, TileDefinition>;
}
