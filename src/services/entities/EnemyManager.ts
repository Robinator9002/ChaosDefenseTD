// src/services/entities/EnemyManager.ts

import type { GameState, Vector2D, EnemyInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

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
        const { enemies, health } = get(); // Also get health as it might be modified
        const updatedEnemies: Record<string, EnemyInstance> = { ...enemies };
        let updatedHealth = health; // Keep track of health changes locally
        let hasChanges = false;

        for (const id in updatedEnemies) {
            const enemy = updatedEnemies[id];
            if (!enemy) continue;

            // Handle enemy reaching the end of the path
            if (enemy.pathIndex >= enemy.path.length - 1) {
                console.log(`Enemy ${enemy.id} reached the end.`);
                updatedHealth -= enemy.config.base_stats.damage; // Deduct health locally
                delete updatedEnemies[id]; // Remove enemy locally
                hasChanges = true;
                continue; // Move to next enemy
            }

            // --- Move enemy logic ---
            const targetPosition = enemy.path[enemy.pathIndex + 1];
            const currentPosition = enemy.position;
            const direction = this.getDirection(currentPosition, targetPosition);
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);
            const distanceToMove = enemy.currentSpeed * dt;

            let newPosition: Vector2D;
            let nextPathIndex = enemy.pathIndex;

            if (distanceToMove >= distanceToTarget) {
                newPosition = { ...targetPosition };
                nextPathIndex++;
            } else {
                newPosition = {
                    x: currentPosition.x + direction.x * distanceToMove,
                    y: currentPosition.y + direction.y * distanceToMove,
                };
            }

            // Check if the position or pathIndex actually changed
            if (
                newPosition.x !== enemy.position.x ||
                newPosition.y !== enemy.position.y ||
                nextPathIndex !== enemy.pathIndex
            ) {
                updatedEnemies[id] = { ...enemy, position: newPosition, pathIndex: nextPathIndex };
                hasChanges = true;
            }
        }

        // After iterating through all enemies, apply the batched updates in a single call.
        if (hasChanges) {
            set((state) => ({
                enemies: updatedEnemies,
                health: updatedHealth, // Update health as part of the batch
            }));
        }
    }

    private getDirection(from: Vector2D, to: Vector2D): Vector2D {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return { x: 0, y: 0 };
        return { x: dx / length, y: dy / length };
    }

    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default EnemyManager;
