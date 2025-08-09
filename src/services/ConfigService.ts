// src/services/ConfigService.ts

import type {
    TowerTypeConfig,
    EnemyTypeConfig,
    GameSettings,
    GlobalUpgrade,
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
        if (this.isInitialized && this.configs) {
            console.log('ConfigService already initialized.');
            return;
        }

        console.log('ConfigService: Starting initialization process...');

        const loadedConfigs: AllConfigs = {
            towerTypes: {},
            towerUpgrades: {},
            enemyTypes: {},
            gameSettings: {} as GameSettings,
            globalUpgrades: {},
            levelStyles: {},
            targetingAi: {},
            difficultyScaling: {},
            waveScaling: {} as WaveScalingConfig,
            statusEffects: {},
            formations: {},
        };
        const loadedTowerUpgrades: Record<string, TowerUpgradeFile> = {};

        // Use dynamic imports to load all JSON configuration files
        // FIX: Change glob pattern to be recursive (**) to find files in subdirectories
        const mainConfigModules = import.meta.glob('../configs/**/*.json', { eager: false });
        const towerUpgradeModules = import.meta.glob('../configs/upgrades/*.json', {
            eager: false,
        });

        console.log('ConfigService: Found main config modules:', Object.keys(mainConfigModules));
        console.log(
            'ConfigService: Found tower upgrade modules:',
            Object.keys(towerUpgradeModules),
        );

        // Process main config files
        for (const path in mainConfigModules) {
            try {
                console.log(`ConfigService: Loading main config from path: ${path}`);
                const module = (await mainConfigModules[path]()) as { default: unknown };
                const key = this.getKeyFromPath(path);

                if (key) {
                    console.log(`ConfigService: Processing key '${key}' from file '${path}'`);
                    console.log(`ConfigService: Data loaded for '${key}':`, module.default);

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
                        case 'globalUpgrades': // If global_upgrades.json ends up here as well via recursive glob
                            loadedConfigs.globalUpgrades = module.default as Record<
                                string,
                                GlobalUpgrade
                            >;
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
                        // Add more cases for other specific top-level configs if needed
                        default:
                            (loadedConfigs as any)[key] = module.default;
                            break;
                    }
                } else {
                    console.warn(`ConfigService: Could not determine key for path: ${path}`);
                }
            } catch (error) {
                console.error(
                    `ConfigService: Failed to load or process main config from ${path}:`,
                    error,
                );
            }
        }

        // Process tower upgrade files (ensure this doesn't double-load if main glob becomes too broad)
        // It's safer to keep it separate as 'upgrades' are usually a distinct category.
        for (const path in towerUpgradeModules) {
            try {
                console.log(`ConfigService: Loading tower upgrade from path: ${path}`);
                const module = (await towerUpgradeModules[path]()) as { default: TowerUpgradeFile };
                const towerId = path.split('/').pop()?.replace('.json', '');
                if (towerId) {
                    loadedTowerUpgrades[towerId] = module.default;
                    console.log(
                        `ConfigService: Loaded upgrade for tower '${towerId}':`,
                        module.default,
                    );
                } else {
                    console.warn(
                        `ConfigService: Could not determine tower ID for upgrade path: ${path}`,
                    );
                }
            } catch (error) {
                console.error(
                    `ConfigService: Failed to load or process tower upgrade from ${path}:`,
                    error,
                );
            }
        }
        loadedConfigs.towerUpgrades = loadedTowerUpgrades;

        this.configs = loadedConfigs;
        this.isInitialized = true;
        console.log('ConfigService: Initialization complete!');
        console.log(
            'ConfigService: Final loaded configurations:',
            JSON.stringify(this.configs, null, 2),
        );
    }

    private getKeyFromPath(path: string): string {
        const fileName = path.split('/').pop()?.replace('.json', '');
        if (!fileName) return '';
        return fileName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }
}

export default ConfigService.getInstance();
