// src/components/hud/TowerBuildMenu.tsx

import { useGameStore } from '../../state/gameStore';
import ConfigService from '../../services/ConfigService';
import type { TowerTypeConfig } from '../../types/configs';

/**
 * A single button in the build menu representing a tower.
 */
const TowerButton = ({ towerId, config }: { towerId: string; config: TowerTypeConfig }) => {
    const { gold, selectedTowerForBuild, setSelectedTowerForBuild } = useGameStore((state) => ({
        gold: state.gold,
        selectedTowerForBuild: state.selectedTowerForBuild,
        setSelectedTowerForBuild: state.setSelectedTowerForBuild,
    }));

    const canAfford = gold >= config.cost;
    const isSelected = selectedTowerForBuild === towerId;

    // Determine button classes based on its state
    const baseClasses =
        'w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all duration-200 cursor-pointer';
    const colorClasses = canAfford
        ? 'bg-chaos-secondary border-chaos-highlight hover:bg-chaos-highlight'
        : 'bg-gray-800 border-gray-700 cursor-not-allowed';
    const selectedClasses =
        isSelected && canAfford
            ? '!bg-chaos-accent !border-yellow-300 ring-2 ring-yellow-300 scale-110'
            : '';

    return (
        <div
            className={`${baseClasses} ${colorClasses} ${selectedClasses}`}
            onClick={() => canAfford && setSelectedTowerForBuild(towerId)}
        >
            <div
                className="w-10 h-10 rounded"
                style={{ backgroundColor: `rgb(${config.placeholder_color.join(',')})` }}
            />
            <span className="mt-1 text-xs font-bold text-chaos-text-primary truncate">
                {config.name}
            </span>
            <span className={`text-xs font-bold ${canAfford ? 'text-yellow-400' : 'text-red-500'}`}>
                {config.cost}G
            </span>
        </div>
    );
};

/**
 * The main HUD component for selecting and building towers.
 */
export const TowerBuildMenu = () => {
    const towerTypes = ConfigService.configs?.towerTypes;

    if (!towerTypes) {
        return <div>Loading towers...</div>;
    }

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 rounded-lg bg-chaos-primary/80 backdrop-blur-sm border border-chaos-highlight shadow-lg">
            {Object.entries(towerTypes).map(([id, config]) => (
                <TowerButton key={id} towerId={id} config={config} />
            ))}
        </div>
    );
};
