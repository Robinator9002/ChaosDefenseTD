// src/game/types/index.ts

/**
 * This file centralizes all TypeScript type definitions for the game.
 * Consolidating types makes them easier to manage, import, and reuse across the application.
 */

// A simple 2D vector for position and movement.
export interface IVector {
    x: number;
    y: number;
}

// Represents a point in the enemy's path.
export interface IPathPoint extends IVector {}

// Defines the state of a single cell in the placement grid.
export interface IGridCell {
    isPath: boolean;
    isOccupied: boolean;
}

// Describes a single upgrade level for a tower.
export interface IUpgrade {
    cost: number;
    damage?: number;
    range?: number;
    fireRate?: number;
    aoeRadius?: number;
}

// Defines the static properties and upgrade path for a type of tower.
export interface ITowerType {
    name: string;
    cost: number;
    color: string;
    baseDamage: number;
    baseRange: number;
    baseFireRate: number;
    projectileSpeed: number;
    projectileColor: string;
    aoeRadius?: number;
    upgrades: IUpgrade[];
}

// Defines the static properties for a type of enemy.
export interface IEnemyType {
    name: string;
    color: string;
    speed: number;
    hp: number;
    size: number;
    reward: number;
}

// Describes the composition of a single enemy wave.
export interface IWave {
    [enemyType: string]: number;
}

// Defines the shape of the main game state object managed by React.
export interface IGameState {
    playerHealth: number;
    money: number;
    wave: number;
    isWaveActive: boolean;
    gameOver: boolean;
    victory: boolean;
}

// Defines the properties for a modal dialog.
export interface IModalState {
    show: boolean;
    title: string;
    text: string;
    color: string;
}
