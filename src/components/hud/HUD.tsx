// src/components/HUD.tsx

/**
 * This component renders the main game Heads-Up Display (HUD).
 * It's a "presentational" component, meaning it only displays data and calls
 * functions passed to it via props. It doesn't contain any game logic itself.
 */

import React from 'react';
import type { IGameState } from '../../types';
import { TOWER_TYPES } from '../../game/config/constants';

// Define the props the HUD component expects to receive.
interface IHUDProps {
    gameState: IGameState;
    selectedTowerType: string | null;
    onSelectTower: (type: string) => void;
    onStartWave: () => void;
}

export const HUD: React.FC<IHUDProps> = ({
    gameState,
    selectedTowerType,
    onSelectTower,
    onStartWave,
}) => {
    return (
        <>
            {/* Top HUD: Displays player stats and current wave. */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
                <div className="flex gap-4">
                    <div className="bg-chaos-primary/80 border border-chaos-highlight shadow-lg shadow-chaos-highlight/30 rounded-lg px-4 py-2 text-lg font-bold">
                        ❤️ Health: {gameState.playerHealth}
                    </div>
                    <div className="bg-chaos-primary/80 border border-chaos-highlight shadow-lg shadow-chaos-highlight/30 rounded-lg px-4 py-2 text-lg font-bold">
                        💰 Money: {gameState.money}
                    </div>
                </div>
                <div className="bg-chaos-primary/80 border border-chaos-highlight shadow-lg shadow-chaos-highlight/30 rounded-lg px-4 py-2 text-lg font-bold">
                    🌊 Wave: {gameState.wave}
                </div>
            </div>

            {/* Bottom HUD: Contains tower selection and the start wave button. */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end z-10">
                {/* Tower Selection Buttons */}
                <div className="flex gap-4">
                    {Object.entries(TOWER_TYPES).map(([key, tower]) => (
                        <button
                            key={key}
                            onClick={() => onSelectTower(key)}
                            disabled={gameState.money < tower.cost}
                            className={`w-32 text-center p-3 rounded-lg border-2 transition-all duration-200
                                ${
                                    selectedTowerType === key
                                        ? 'bg-chaos-accent border-chaos-accent text-white scale-105 shadow-lg shadow-chaos-accent/50'
                                        : 'bg-chaos-secondary border-chaos-highlight hover:border-chaos-accent'
                                }
                                ${
                                    gameState.money < tower.cost
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:scale-105'
                                }`}
                        >
                            <div className="text-xl">{key === 'gatling' ? '💥' : '🚀'}</div>
                            <div className="font-bold">{tower.name}</div>
                            <div className="text-sm text-yellow-400">Cost: {tower.cost}</div>
                        </button>
                    ))}
                </div>

                {/* Start Wave Button */}
                <button
                    onClick={onStartWave}
                    disabled={gameState.isWaveActive || gameState.gameOver || gameState.victory}
                    className="bg-chaos-accent rounded-lg px-8 py-4 text-xl font-black uppercase tracking-widest text-white
                               hover:bg-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-chaos-text-disabled"
                >
                    {gameState.isWaveActive ? `Wave ${gameState.wave}` : 'Start Wave'}
                </button>
            </div>
        </>
    );
};
