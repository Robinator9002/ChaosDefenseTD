// src/views/Game.tsx

import { GameCanvas } from '../components/game/GameCanvas';
import { TopStatsBar } from '../components/hud/bars/TopStatsBar';
import { TowerBuildMenu } from '../components/hud/TowerBuildMenu';

/**
 * The main view for the active game session.
 * It assembles the core components required for gameplay and manages
 * their stacking order with z-index.
 */
export const Game = () => {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-chaos-primary">
            {/* The GameCanvas is the base layer */}
            <div className="absolute inset-0 z-0">
                <GameCanvas />
            </div>

            {/* --- HUD Elements --- */}
            {/* We give the HUD a higher z-index to ensure it renders on top */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {/* pointer-events-none on the container allows clicks to pass through to the canvas */}
                {/* We re-enable pointer-events on the actual UI elements */}
                <div className="pointer-events-auto">
                    <TopStatsBar />
                </div>
                <div className="pointer-events-auto">
                    <TowerBuildMenu />
                </div>
            </div>
        </div>
    );
};
