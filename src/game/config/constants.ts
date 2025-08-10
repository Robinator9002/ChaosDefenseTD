// src/game/config/constants.ts

/**
 * This file contains all the static configuration and balancing data for the game.
 * Separating this from the core logic allows for easier game design iterations and tuning.
 */

import type { IEnemyType, ITowerType, IWave } from '../../types';

// The universal size of a grid tile in pixels. This is a fundamental unit for all positioning.
export const TILE_SIZE = 50;

// Defines the properties and upgrade paths for all available towers.
export const TOWER_TYPES: { [key: string]: ITowerType } = {
    gatling: {
        name: 'Gatling Gun',
        cost: 100,
        color: '#0ea5e9', // A bright, energetic blue
        baseDamage: 5,
        baseRange: 150,
        baseFireRate: 10, // High rate of fire for single targets
        projectileSpeed: 15,
        projectileColor: '#fde047', // Yellow, like tracers
        upgrades: [
            { cost: 75, damage: 3, range: 10 },
            { cost: 150, damage: 5, range: 15, fireRate: 2 },
            { cost: 300, damage: 10, range: 25, fireRate: 3 },
        ],
    },
    rocket: {
        name: 'Rocket Pod',
        cost: 250,
        color: '#f97316', // A fiery orange
        baseDamage: 50, // High area-of-effect damage
        baseRange: 250,
        baseFireRate: 1, // Slow rate of fire
        projectileSpeed: 5,
        projectileColor: '#ef4444', // Red, for explosions
        aoeRadius: 75,
        upgrades: [
            { cost: 200, damage: 25, aoeRadius: 10 },
            { cost: 400, damage: 50, range: 25, aoeRadius: 15 },
            { cost: 800, damage: 100, range: 50, aoeRadius: 20 },
        ],
    },
};

// Defines the properties for all enemy types.
export const ENEMY_TYPES: { [key: string]: IEnemyType } = {
    scout: {
        name: 'Scout',
        color: '#a3e635', // A sickly, fast green
        speed: 2.5,
        hp: 75,
        size: 15,
        reward: 5,
    },
    brute: {
        name: 'Brute',
        color: '#e11d48', // A deep, menacing red
        speed: 1,
        hp: 500,
        size: 25,
        reward: 20,
    },
};

// Defines the composition of each enemy wave. The game will progress through this array.
export const WAVES: IWave[] = [
    { scout: 10, brute: 0 },
    { scout: 15, brute: 2 },
    { scout: 20, brute: 5 },
    { scout: 10, brute: 10 },
    { scout: 0, brute: 15 },
    { scout: 30, brute: 10 },
    { scout: 40, brute: 20 },
    { scout: 0, brute: 40 },
    { scout: 50, brute: 50 },
    { scout: 100, brute: 75 },
];
