// src/components/hud/TowerUpgradeMenu.tsx

import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';
import type { TowerInstance } from '../../types/game';
import type { TowerUpgradeFile, UpgradeConfig, UpgradePath } from '../../types/configs';

/**
 * A single button representing one upgrade in a path.
 */
const UpgradeButton = ({
    upgrade,
    canAfford,
    isApplied,
    onUpgrade,
}: {
    upgrade: UpgradeConfig;
    canAfford: boolean;
    isApplied: boolean;
    onUpgrade: (upgradeId: string) => void;
}) => {
    const buttonClasses = [
        'p-3 rounded-lg border-2 w-full text-left transition-all duration-200',
        isApplied
            ? 'bg-green-800 border-green-500 cursor-default'
            : canAfford
            ? 'bg-chaos-secondary border-chaos-highlight hover:bg-chaos-highlight cursor-pointer'
            : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed',
    ].join(' ');

    return (
        <button
            onClick={() => onUpgrade(upgrade.id)}
            disabled={!canAfford || isApplied}
            className={buttonClasses}
        >
            <div className="flex justify-between items-center">
                <span className="font-bold text-chaos-text-primary">{upgrade.name}</span>
                {!isApplied && (
                    <span className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-500'}`}>
                        {upgrade.cost}G
                    </span>
                )}
            </div>
            <p className="text-sm text-chaos-text-secondary mt-1">{upgrade.description}</p>
        </button>
    );
};

/**
 * A component that displays one full upgrade path (e.g., Path A or Path B).
 */
const UpgradePathColumn = ({ path, tower }: { path: UpgradePath; tower: TowerInstance }) => {
    const gold = useGameStore((state) => state.gold);

    // This function will eventually call the store action
    const handleUpgrade = (upgradeId: string) => {
        console.log(`Attempting to buy upgrade ${upgradeId} for tower ${tower.id}`);
        // TODO: Call the `upgradeTower` action from the store here.
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="p-2 rounded-t-lg bg-black/30 text-center">
                <h3 className="font-bold text-lg text-chaos-accent">{path.name}</h3>
                <p className="text-xs text-chaos-text-secondary">{path.description}</p>
            </div>
            <div className="flex flex-col gap-2 px-2 pb-2">
                {path.upgrades.map((upgrade) => (
                    <UpgradeButton
                        key={upgrade.id}
                        upgrade={upgrade}
                        canAfford={gold >= upgrade.cost}
                        isApplied={tower.appliedUpgradeIds.includes(upgrade.id)}
                        onUpgrade={handleUpgrade}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * The main UI panel for displaying and purchasing tower upgrades.
 * It appears when a tower is selected on the canvas.
 */
export const TowerUpgradeMenu = () => {
    // Subscribe to the ID of the selected tower. The component will re-render when this changes.
    const selectedTowerId = useGameStore((state) => state.selectedTowerInstanceId);

    // Get the full tower instance from the store if an ID is selected.
    const selectedTower = useGameStore((state) =>
        selectedTowerId ? state.towers[selectedTowerId] : null,
    );

    if (!selectedTower) {
        return null; // Render nothing if no tower is selected.
    }

    // The tower's ID in the config (e.g., "turret", "mortar") is derived from its sprite_key.
    // This is a bit of a temporary solution until a more direct ID is available on the config.
    const towerTypeKey = selectedTower.config.sprite_key.split('/')[1].replace('.png', '');
    const upgradeFile = ConfigService.configs?.towerUpgrades[towerTypeKey] as
        | TowerUpgradeFile
        | undefined;

    if (!upgradeFile) {
        console.warn(`No upgrade file found for tower type: ${towerTypeKey}`);
        return null;
    }

    return (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 w-96 max-w-[40vw] bg-chaos-primary/80 backdrop-blur-sm border border-chaos-highlight shadow-lg rounded-lg flex flex-col">
            <div className="p-4 border-b border-chaos-highlight">
                <h2 className="text-2xl font-bold text-chaos-text-primary text-center">
                    {selectedTower.config.name}
                </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
                <UpgradePathColumn path={upgradeFile.path_a} tower={selectedTower} />
                <UpgradePathColumn path={upgradeFile.path_b} tower={selectedTower} />
            </div>
        </div>
    );
};
