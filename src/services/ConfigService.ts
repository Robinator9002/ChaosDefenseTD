// src/services/ConfigService.ts

import type {
    TowerTypeConfig,
    EnemyTypeConfig,
    GameSettings,
    GlobalUpgrade,
    LevelStyleConfig,
    TargetingPersona,
    TowerUpgradeFile,
} from '../types/configs';

/**
 * Defines the final, structured shape of all loaded configuration data.
 */
export interface AllConfigs {
    towerTypes: Record<string, TowerTypeConfig>;
    towerUpgrades: Record<string, TowerUpgradeFile>;
    enemyTypes: Record<string, EnemyTypeConfig>;
    gameSettings: GameSettings;
    globalUpgrades: Record<string, GlobalUpgrade>;
    levelStyles: Record<string, LevelStyleConfig>;
    targetingAi: Record<string, TargetingPersona>;
    // Add other config types as needed, e.g., formations, status_effects
    [key: string]: unknown;
}

/**
 * A singleton service responsible for loading, processing, and providing
 * all static game configuration data from the JSON files.
 */
class ConfigService {
    private static instance: ConfigService;
    public configs: AllConfigs | null = null;
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * Initializes the service by loading and processing all config files.
     * This must be called once at application startup.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('ConfigService is already initialized.');
            return;
        }

        console.log('Initializing ConfigService...');

        // Use Vite's import.meta.glob to dynamically import all JSON files
        const configModules = import.meta.glob('../configs/**/*.json');
        const towerUpgradeModules = import.meta.glob('../configs/upgrades/towers/*.json');

        const loadedConfigs: Partial<AllConfigs> = {};
        const loadedTowerUpgrades: Record<string, TowerUpgradeFile> = {};

        // Process main config files
        for (const path in configModules) {
            // Exclude tower upgrades, as they are handled separately
            if (path.includes('/upgrades/towers/')) continue;

            const module = (await configModules[path]()) as { default: unknown };
            // Extract a key from the file path (e.g., '../configs/tower_types.json' -> 'towerTypes')
            const key = this.getKeyFromPath(path);
            if (key) {
                loadedConfigs[key as keyof AllConfigs] = module.default;
            }
        }

        // Process and merge individual tower upgrade files
        for (const path in towerUpgradeModules) {
            const module = (await towerUpgradeModules[path]()) as { default: TowerUpgradeFile };
            // Extract tower ID from filename (e.g., 'mortar.json' -> 'mortar')
            const towerId = path.split('/').pop()?.replace('.json', '');
            if (towerId) {
                loadedTowerUpgrades[towerId] = module.default;
            }
        }
        loadedConfigs.towerUpgrades = loadedTowerUpgrades;

        this.configs = loadedConfigs as AllConfigs;
        this.isInitialized = true;
        console.log('ConfigService initialized successfully with:', this.configs);
    }

    /**
     * A helper to convert a file path into a camelCase key for the configs object.
     * e.g., '../configs/game_settings.json' becomes 'gameSettings'
     */
    private getKeyFromPath(path: string): string {
        const fileName = path.split('/').pop()?.replace('.json', '');
        if (!fileName) return '';
        // Convert snake_case to camelCase
        return fileName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }
}

export default ConfigService.getInstance();
