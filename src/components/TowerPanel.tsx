// src/components/TowerPanel.tsx

/**
 * This component renders the panel for upgrading and selling a selected tower.
 * It's displayed when a player clicks on a tower on the map.
 */

import React from 'react';
import { Tower } from '../game/classes/indexClasses';
import { TOWER_TYPES } from '../game/config/constants';
import type { IGameState } from '../game/types';

// Define the props the TowerPanel component expects.
interface ITowerPanelProps {
    selectedTower: Tower;
    gameState: IGameState;
    onUpgrade: () => void;
    onSell: () => void;
    onClose: () => void;
}

export const TowerPanel: React.FC<ITowerPanelProps> = ({
    selectedTower,
    gameState,
    onUpgrade,
    onSell,
    onClose,
}) => {
    const upgradeCost = selectedTower.getUpgradeCost();
    const sellValue = selectedTower.getSellValue();

    return (
        <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-6 rounded-lg z-20 text-center
                       bg-chaos-secondary/95 border-2 border-chaos-highlight shadow-2xl shadow-chaos-highlight/50 w-80"
        >
            {/* Panel Header */}
            <h3 className="text-2xl font-bold mb-4">
                {TOWER_TYPES[selectedTower.type].name} (Lvl {selectedTower.level + 1})
            </h3>

            {/* Tower Stats Display */}
            <div className="mb-4 text-left space-y-1 text-chaos-text-primary">
                <p>Damage: {selectedTower.damage.toFixed(1)}</p>
                <p>Range: {selectedTower.range.toFixed(0)}</p>
                <p>Fire Rate: {selectedTower.fireRate.toFixed(1)}/s</p>
                {selectedTower.aoeRadius > 0 && (
                    <p>AOE Radius: {selectedTower.aoeRadius.toFixed(0)}</p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
                <button
                    onClick={onUpgrade}
                    disabled={gameState.money < upgradeCost}
                    className="bg-green-600 hover:bg-green-500 rounded-lg px-6 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {upgradeCost === Infinity ? 'Max Level' : `Upgrade (${upgradeCost}💰)`}
                </button>
                <button
                    onClick={onSell}
                    className="bg-chaos-accent hover:bg-red-500 rounded-lg px-6 py-2 text-white font-bold"
                >
                    Sell ({sellValue}💰)
                </button>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-2 right-3 text-2xl text-chaos-text-secondary hover:text-white"
            >
                &times;
            </button>
        </div>
    );
};
