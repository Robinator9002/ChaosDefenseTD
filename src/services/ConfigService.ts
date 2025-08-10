// src/services/ConfigService.ts

import type {
    TowerTypeConfig,
    EnemyTypeConfig,
    GameSettings,
    LevelStyleConfig,
    TargetingPersona,
    AllConfigs,
    WaveScalingConfig,
    DifficultyScalingConfig,
    TowerUpgradeFile,
} from '../types/configs';

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
            console.log('ConfigService already initialized.');
            return;
        }

        console.log('ConfigService: Starting initialization process...');

        const loadedConfigs: Partial<AllConfigs> & {
            towerUpgrades: Record<string, TowerUpgradeFile>;
        } = {
            towerUpgrades: {},
        };

        // Use a single, recursive glob to find all JSON files.
        const configModules = import.meta.glob('../configs/**/*.json', { eager: false });

        console.log('ConfigService: Found config modules:', Object.keys(configModules));

        for (const path in configModules) {
            try {
                const module = (await configModules[path]()) as { default: unknown };

                // --- FIX: Logic to correctly sort tower upgrades from other configs ---
                // If the path is for a tower upgrade file, process it separately.
                if (path.includes('/upgrades/towers/')) {
                    const towerId = path.split('/').pop()?.replace('.json', '');
                    if (towerId) {
                        loadedConfigs.towerUpgrades[towerId] = module.default as TowerUpgradeFile;
                        console.log(`ConfigService: Loaded UPGRADE for tower '${towerId}'`);
                    }
                    continue; // Skip to the next file
                }

                // Otherwise, process it as a general config file.
                const key = this.getKeyFromPath(path);
                if (key) {
                    console.log(`ConfigService: Processing key '${key}' from file '${path}'`);
                    switch (key) {
                        case 'gameSettings':
                            loadedConfigs.gameSettings = module.default as GameSettings;
                            break;
                        case 'towerTypes':
                            loadedConfigs.towerTypes = module.default as Record<
                                string,
                                TowerTypeConfig
                            >;
                            break;
                        case 'enemyTypes':
                            loadedConfigs.enemyTypes = module.default as Record<
                                string,
                                EnemyTypeConfig
                            >;
                            break;
                        case 'waveScaling':
                            loadedConfigs.waveScaling = module.default as WaveScalingConfig;
                            break;
                        case 'difficultyScaling':
                            loadedConfigs.difficultyScaling =
                                module.default as DifficultyScalingConfig;
                            break;
                        case 'levelStyles':
                            loadedConfigs.levelStyles = module.default as Record<
                                string,
                                LevelStyleConfig
                            >;
                            break;
                        case 'targetingAi':
                            loadedConfigs.targetingAi = module.default as Record<
                                string,
                                TargetingPersona
                            >;
                            break;
                        // Handle other specific top-level configs
                        default:
                            (loadedConfigs as any)[key] = module.default;
                            break;
                    }
                }
            } catch (error) {
                console.error(
                    `ConfigService: Failed to load or process config from ${path}:`,
                    error,
                );
            }
        }

        this.configs = loadedConfigs as AllConfigs;
        this.isInitialized = true;
        console.log('ConfigService: Initialization complete!');
        console.log('ConfigService: Final loaded configurations:', this.configs);
    }

    /**
     * Generates a camelCase key from a file path.
     * e.g., '../configs/gameplay/game_settings.json' -> 'gameSettings'
     * e.g., '../configs/upgrades/global_upgrades.json' -> 'globalUpgrades'
     */
    private getKeyFromPath(path: string): string {
        const fileName = path.split('/').pop()?.replace('.json', '');
        if (!fileName) return '';
        return fileName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }
}

export default ConfigService.getInstance();
