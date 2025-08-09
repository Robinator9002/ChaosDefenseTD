// src/views/Game.tsx

import { GameLoop } from '../core/GameLoop';
import { GameCanvas } from '../components/game/GameCanvas';

/**
 * The main view for the active game session.
 * It assembles the core components required for gameplay:
 * - GameLoop: Handles the logic updates.
 * - GameCanvas: Handles the rendering.
 * - HUD components will be added here later.
 */
export const Game = () => {
    return (
        <div className="relative w-full h-screen bg-chaos-primary">
            {/* The GameLoop is a non-visual component that drives updates */}
            <GameLoop />

            {/* The GameCanvas handles all the rendering of the game world */}
            <GameCanvas />

            {/* Future HUD elements will be placed here.
        They will overlay the canvas.
        e.g., <TopStatsBar /> 
              <TowerBuildMenu />
      */}
        </div>
    );
};
