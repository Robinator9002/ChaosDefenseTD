// src/state/gameStore.ts

import { create } from 'zustand';
import type { GameState, AppStatus } from '../types/game';

/**
 * Defines the actions that can be performed on the game state.
 * These are the functions that will mutate our state.
 */
interface GameActions {
    setAppStatus: (status: AppStatus) => void;
    addGold: (amount: number) => void;
    removeHealth: (amount: number) => void;
    // More complex actions for managing entities will be added later
    // e.g., addEnemy, addTower, updateEnemyPosition, etc.
}

// Define the initial state of our game
const initialState: GameState = {
    appStatus: 'main-menu',
    gold: 200, // A sensible starting value, can be overridden by level configs
    health: 25, // Same as above
    currentWave: 0,
    enemies: {},
    towers: {},
    projectiles: {},
    selectedTowerForBuild: null,
    selectedTowerInstanceId: null,
};

/**
 * Create the Zustand store, which combines the state and actions.
 * This hook will be our primary way of interacting with the game's state
 * from anywhere in the component tree.
 */
export const useGameStore = create<GameState & GameActions>((set: any) => ({
    ...initialState,

    // --- ACTIONS ---

    /**
     * Sets the overall status of the application (e.g., in menu, in game).
     * @param status The new application status.
     */
    setAppStatus: (status: AppStatus) => set({ appStatus: status }),

    /**
     * Adds a specified amount of gold to the player's resources.
     * @param amount The amount of gold to add.
     */
    addGold: (amount: number) => set((state: any) => ({ gold: state.gold + amount })),

    /**
     * Removes a specified amount of health from the player's base.
     * @param amount The amount of health to remove.
     */
    removeHealth: (amount: number) =>
        set((state: any) => ({ health: Math.max(0, state.health - amount) })),
}));
