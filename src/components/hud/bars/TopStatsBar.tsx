// src/components/hud/bars/TopStatsBar.tsx

import { useGameStore } from '../../../state/gameStore';
// No need for 'shallow' anymore with individual selectors
// import { shallow } from 'zustand/shallow';

/**
 * A heads-up display (HUD) component that shows the player's core stats:
 * gold, health, and the current wave number. It subscribes to the
 * game state and updates automatically.
 */
export const TopStatsBar = () => {
    // --- FIX ---
    // We now use individual selectors for each state property.
    // This ensures that the component only re-renders when the specific
    // value (gold, health, or currentWave) changes, not just when the
    // object reference returned by a combined selector changes.
    const gold = useGameStore((state) => state.gold);
    const health = useGameStore((state) => state.health);
    const currentWave = useGameStore((state) => state.currentWave);

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-2 rounded-lg bg-chaos-primary/80 backdrop-blur-sm border border-chaos-highlight shadow-lg">
            {/* Gold Display */}
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-400">💰</span>
                <span className="text-xl font-bold text-chaos-text-primary">{gold}</span>
            </div>

            {/* Health Display */}
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-500">❤️</span>
                <span className="text-xl font-bold text-chaos-text-primary">{health}</span>
            </div>

            {/* Wave Display */}
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-400">🌊</span>
                <span className="text-xl font-bold text-chaos-text-primary">{currentWave}</span>
            </div>
        </div>
    );
};
