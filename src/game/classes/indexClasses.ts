// src/game/classes/indexClasses.ts

/**
 * This file contains the class definitions for all dynamic game entities.
 * The constructors have been updated to accept a configuration object,
 * decoupling them from static constants and allowing them to use data loaded from JSON.
 */

import type { IPathPoint, ITowerType, IEnemyType } from '../../types';

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

    // Ref to the loaded tower configuration
    private towerTypes: { [key: string]: ITowerType };

    constructor(
        id: number,
        x: number,
        y: number,
        type: string,
        towerTypes: { [key: string]: ITowerType },
    ) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 0;
        this.target = null;
        this.fireCooldown = 0;

        // Store the config for later use
        this.towerTypes = towerTypes;

        // Initialize stats based on type and level
        this.damage = 0;
        this.range = 0;
        this.fireRate = 0;
        this.aoeRadius = 0;
        this.updateStats();
    }

    /**
     * Recalculates the tower's stats based on its type and current level.
     */
    public updateStats(): void {
        const typeData = this.towerTypes[this.type];
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
     */
    public findTarget(enemies: Enemy[]): void {
        this.target = null;
        let closestDist = this.range * this.range;
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
     */
    public getUpgradeCost(): number {
        const typeData = this.towerTypes[this.type];
        if (this.level < typeData.upgrades.length) {
            return typeData.upgrades[this.level].cost;
        }
        return Infinity;
    }

    /**
     * Calculates the sell value of the tower.
     */
    public getSellValue(): number {
        let value = this.towerTypes[this.type].cost;
        for (let i = 0; i < this.level; i++) {
            value += this.towerTypes[this.type].upgrades[i].cost;
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

    constructor(
        id: number,
        type: string,
        path: IPathPoint[],
        enemyTypes: { [key: string]: IEnemyType },
    ) {
        const typeData = enemyTypes[type];
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
    public radius: number;
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
            this.maxLife = 0.3;
            this.life = this.maxLife;
            this.radius = options.radius;
        } else {
            this.maxLife = Math.random() * 0.5 + 0.2;
            this.life = this.maxLife;
            this.radius = 0;
            this.color = options.color;
            this.size = Math.random() * 5 + 2;
            this.vx = (Math.random() - 0.5) * 150;
            this.vy = (Math.random() - 0.5) * 150;
        }
    }
}
