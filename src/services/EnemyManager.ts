// src/services/EnemyManager.ts

import type { GameState, Vector2D, EnemyInstance } from '../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for all active enemies, including movement,
 * pathfinding, and health updates.
 */
class EnemyManager {
    /**
     * The main update function for the enemy manager, called on every game tick.
     * @param get A function to get the current state from the Zustand store.
     * @param set A function to set the state in the Zustand store.
     * @param dt Delta time since the last frame.
     */
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { enemies } = get();
        const enemyIds = Object.keys(enemies);

        for (const id of enemyIds) {
            const enemy = enemies[id];
            if (!enemy) continue;

            this.moveEnemy(get, set, enemy, dt);
        }
    }

    /**
     * Handles the movement logic for a single enemy.
     */
    private moveEnemy(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        enemy: EnemyInstance,
        dt: number,
    ): void {
        // Check if enemy has reached the end of the path
        if (enemy.pathIndex >= enemy.path.length - 1) {
            console.log(`Enemy ${enemy.id} reached the end.`);
            get().removeHealth(enemy.config.base_stats.damage);
            get().removeEnemy(enemy.id);
            return;
        }

        const targetPosition = enemy.path[enemy.pathIndex + 1];
        const currentPosition = enemy.position;
        const direction = this.getDirection(currentPosition, targetPosition);

        const distanceToTarget = this.getDistance(currentPosition, targetPosition);
        const distanceToMove = enemy.currentSpeed * dt;

        let newPosition: Vector2D;
        let nextPathIndex = enemy.pathIndex;

        if (distanceToMove >= distanceToTarget) {
            // The enemy has reached or overshot the target node
            newPosition = { ...targetPosition };
            nextPathIndex++;
        } else {
            // Move the enemy along the direction vector
            newPosition = {
                x: currentPosition.x + direction.x * distanceToMove,
                y: currentPosition.y + direction.y * distanceToMove,
            };
        }

        // Update the enemy's state in the store
        get().updateEnemy(enemy.id, {
            position: newPosition,
            pathIndex: nextPathIndex,
        });
    }

    /**
     * Calculates the normalized direction vector between two points.
     */
    private getDirection(from: Vector2D, to: Vector2D): Vector2D {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return { x: 0, y: 0 };
        return { x: dx / length, y: dy / length };
    }

    /**
     * Calculates the Euclidean distance between two points.
     */
    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default EnemyManager;
