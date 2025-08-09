// src/components/hud/bars/TopStatsBar.tsx

import { useGameStore } from '../../../state/gameStore';
import { shallow } from 'zustand/shallow';

/**
 * A heads-up display (HUD) component that shows the player's core stats:
 * gold, health, and the current wave number. It subscribes to the
 * game state and updates automatically.
 */
export const TopStatsBar = () => {
    // Use a "selector" to subscribe to only the specific state properties
    // this component needs.
    //
    // --- FIX ---
    // We now use `shallow` as the second argument. This tells Zustand to
    // compare the properties of the returned object, rather than the object
    // reference itself. This prevents an infinite re-render loop that occurs
    // when returning a new object from the selector on every render.
    const { gold, health, currentWave } = useGameStore(
        (state) => ({
            gold: state.gold,
            health: state.health,
            currentWave: state.currentWave,
        }),
        shallow,
    );

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
