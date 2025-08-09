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
    // Subscribe to the application's status from the Zustand store
    const appStatus = useGameStore((state) => state.appStatus);
    const initializeGameSession = useGameStore((state) => state.initializeGameSession);

    // State to track if our essential configs have been loaded
    const [isInitialized, setIsInitialized] = useState(false);

    // This effect runs once when the application first mounts
    useEffect(() => {
        const initializeApp = async () => {
            console.log('App mounting, initializing ConfigService...');
            await ConfigService.initialize();
            setIsInitialized(true);
            console.log('Initialization complete.');
        };

        initializeApp();
    }, []); // The empty dependency array ensures this runs only once

    // Simple router to display the correct view based on appStatus
    const renderContent = () => {
        if (!isInitialized) {
            // Display a loading screen while configs are being loaded
            return (
                <div className="flex items-center justify-center w-screen h-screen">Loading...</div>
            );
        }

        switch (appStatus) {
            case 'in-game':
                return <Game />;

            case 'main-menu':
                // A simple main menu for now. We will build a proper one in Phase 4.
                return (
                    <div className="flex flex-col items-center justify-center w-screen h-screen gap-4">
                        <h1 className="text-5xl font-bold text-chaos-accent">ChaosDefenseTD</h1>
                        <p className="text-lg text-chaos-text-secondary">React Edition</p>
                        <button
                            onClick={initializeGameSession}
                            className="px-8 py-4 mt-8 font-bold text-white transition-transform rounded-lg bg-chaos-highlight hover:bg-chaos-accent hover:scale-105"
                        >
                            Start Game
                        </button>
                    </div>
                );

            // Add cases for 'workshop', 'level-select', etc. later
            default:
                return <div>Unknown App Status</div>;
        }
    };

    return <>{renderContent()}</>;
}

export default App;
