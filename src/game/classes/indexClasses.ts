// src/game/classes/indexClasses.ts

/**
 * This file contains the class definitions for all dynamic game entities.
 * These classes are not React components; they are blueprints for objects
 * that will be managed within the game loop.
 */

import type { IPathPoint } from '../types';
import { TOWER_TYPES, ENEMY_TYPES } from '../config/constants';

/**
 * Represents a single tower placed on the grid by the player.
 */
export class Tower {
    // Public properties for easy access within the game loop
    public id: number;
    public x: number;
    public y: number;
    public type: string;
    public level: number;
    public target: Enemy | null;
    public fireCooldown: number;

    // Stats that change with upgrades
    public damage: number;
    public range: number;
    public fireRate: number;
    public aoeRadius: number;

    constructor(id: number, x: number, y: number, type: string) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 0;
        this.target = null;
        this.fireCooldown = 0;

        // Initialize stats based on type and level
        this.damage = 0;
        this.range = 0;
        this.fireRate = 0;
        this.aoeRadius = 0;
        this.updateStats();
    }

    /**
     * Recalculates the tower's stats based on its type and current level.
     * This should be called after a tower is upgraded.
     */
    public updateStats(): void {
        const typeData = TOWER_TYPES[this.type];
        this.damage = typeData.baseDamage;
        this.range = typeData.baseRange;
        this.fireRate = typeData.baseFireRate;
        this.aoeRadius = typeData.aoeRadius || 0;

        for (let i = 0; i < this.level; i++) {
            const upgrade = typeData.upgrades[i];
            this.damage += upgrade.damage || 0;
            this.range += upgrade.range || 0;
            this.fireRate += upgrade.fireRate || 0;
            this.aoeRadius += upgrade.aoeRadius || 0;
        }
    }

    /**
     * Finds the closest enemy within range to target.
     * @param enemies - An array of all active enemies on the map.
     */
    public findTarget(enemies: Enemy[]): void {
        this.target = null;
        let closestDist = this.range * this.range; // Use squared distance for performance
        for (const enemy of enemies) {
            const distSq = (this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2;
            if (distSq < closestDist) {
                closestDist = distSq;
                this.target = enemy;
            }
        }
    }

    /**
     * Gets the cost of the next upgrade.
     * @returns The cost, or Infinity if the tower is max level.
     */
    public getUpgradeCost(): number {
        const typeData = TOWER_TYPES[this.type];
        if (this.level < typeData.upgrades.length) {
            return typeData.upgrades[this.level].cost;
        }
        return Infinity;
    }

    /**
     * Calculates the sell value of the tower (a percentage of total cost).
     * @returns The amount of money returned to the player upon selling.
     */
    public getSellValue(): number {
        let value = TOWER_TYPES[this.type].cost;
        for (let i = 0; i < this.level; i++) {
            value += TOWER_TYPES[this.type].upgrades[i].cost;
        }
        return Math.floor(value * 0.75);
    }
}

/**
 * Represents a single enemy moving along the path.
 */
export class Enemy {
    public id: number;
    public type: string;
    public pathIndex: number;
    public x: number;
    public y: number;
    public speed: number;
    public maxHp: number;
    public hp: number;
    public size: number;
    public reward: number;
    public color: string;
    public isDead: boolean;

    constructor(id: number, type: string, path: IPathPoint[]) {
        const typeData = ENEMY_TYPES[type];
        this.id = id;
        this.type = type;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.speed = typeData.speed;
        this.maxHp = typeData.hp;
        this.hp = typeData.hp;
        this.size = typeData.size;
        this.reward = typeData.reward;
        this.color = typeData.color;
        this.isDead = false;
    }

    /**
     * Reduces the enemy's health by a given amount.
     * @param amount - The amount of damage to inflict.
     */
    public takeDamage(amount: number): void {
        this.hp -= amount;
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
        }
    }
}

/**
 * Represents a projectile fired from a tower towards an enemy.
 */
export class Projectile {
    public id: number;
    public x: number;
    public y: number;
    public target: Enemy;
    public damage: number;
    public speed: number;
    public color: string;
    public towerType: string;
    public aoeRadius: number;
    public isDead: boolean;

    constructor(
        id: number,
        x: number,
        y: number,
        target: Enemy,
        damage: number,
        speed: number,
        color: string,
        towerType: string,
        aoeRadius: number,
    ) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.towerType = towerType;
        this.aoeRadius = aoeRadius;
        this.isDead = false;
    }
}

/**
 * Represents a temporary visual effect, like an explosion or particle spray.
 */
export class Effect {
    public id: number;
    public x: number;
    public y: number;
    public life: number;
    public maxLife: number;
    public type: 'explosion' | 'particle';

    // Explosion-specific
    public radius: number;

    // Particle-specific
    public color?: string;
    public size?: number;
    public vx?: number;
    public vy?: number;

    constructor(id: number, x: number, y: number, type: 'explosion' | 'particle', options: any) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;

        if (type === 'explosion') {
            this.maxLife = 0.3; // Explosions are quick
            this.life = this.maxLife;
            this.radius = options.radius;
        } else {
            // particle
            this.maxLife = Math.random() * 0.5 + 0.2; // Particles linger a bit
            this.life = this.maxLife;
            this.radius = 0;
            this.color = options.color;
            this.size = Math.random() * 5 + 2;
            this.vx = (Math.random() - 0.5) * 150; // Random outward velocity
            this.vy = (Math.random() - 0.5) * 150;
        }
    }
}
