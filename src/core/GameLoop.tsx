// src/core/GameLoop.tsx

import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';

/**
 * A non-rendering component that drives the game's update cycle.
 * It uses requestAnimationFrame to call the Zustand store's update
 * method on every frame, providing a delta time for frame-rate
 * independent calculations.
 */
export const GameLoop = () => {
    // Select the necessary state and actions from the Zustand store.
    const update = useGameStore((state) => state.update);
    const appStatus = useGameStore((state) => state.appStatus);

    // Use refs to store loop-related variables to prevent re-renders
    // from affecting the loop's state.
    const lastTimeRef = useRef<number>(0);
    const frameIdRef = useRef<number>(0);

    const loop = (currentTime: number) => {
        // Calculate delta time (dt) in seconds.
        const dt = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;

        // Call the main update function from our state manager.
        update(dt);

        // Continue the loop.
        frameIdRef.current = requestAnimationFrame(loop);
    };

    useEffect(() => {
        // Start the loop only when the game is active.
        if (appStatus === 'in-game') {
            console.log('Starting game loop...');
            lastTimeRef.current = performance.now();
            frameIdRef.current = requestAnimationFrame(loop);
        }

        // Cleanup function: This will be called when the component unmounts
        // or when the dependencies of the useEffect hook change.
        return () => {
            console.log('Stopping game loop...');
            cancelAnimationFrame(frameIdRef.current);
        };
    }, [appStatus]); // The loop will restart if the appStatus changes.

    // This component does not render anything to the DOM.
    return null;
};
