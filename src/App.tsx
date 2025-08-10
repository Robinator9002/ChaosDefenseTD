// src/App.tsx

import { useEffect, useState } from 'react';
import { useGameStore } from './state/gameStore';
import ConfigService from './services/ConfigService';
import { Game } from './views/Game';

/**
 * The main application component. It handles the initial setup,
 * loading of configuration files, and routing between different
 * application views (e.g., Main Menu, Game).
 */
function App() {
    const appStatus = useGameStore((state) => state.appStatus);
    const initializeGameSession = useGameStore((state) => state.initializeGameSession);

    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initializeApp = async () => {
            console.log('App mounting, initializing ConfigService...');
            await ConfigService.initialize();
            setIsInitialized(true);
            console.log('Initialization complete.');
        };

        initializeApp();
    }, []);

    const renderContent = () => {
        if (!isInitialized) {
            return (
                <div className="flex items-center justify-center w-screen h-screen">Loading...</div>
            );
        }

        switch (appStatus) {
            case 'in-game':
                return <Game />;

            case 'main-menu':
                return (
                    <div className="flex flex-col items-center justify-center w-screen h-screen gap-4">
                        <h1 className="text-5xl font-bold text-chaos-accent">ChaosDefenseTD</h1>
                        <p className="text-lg text-chaos-text-secondary">React Edition</p>
                        <button
                            // FIX: Use an arrow function to call `initializeGameSession` with a specific level style.
                            // This prevents the click event object from being passed as the level name.
                            onClick={() => initializeGameSession('Forest')}
                            className="px-8 py-4 mt-8 font-bold text-white transition-transform rounded-lg bg-chaos-highlight hover:bg-chaos-accent hover:scale-105"
                        >
                            Start Game
                        </button>
                    </div>
                );

            default:
                return <div>Unknown App Status</div>;
        }
    };

    return <>{renderContent()}</>;
}

export default App;
