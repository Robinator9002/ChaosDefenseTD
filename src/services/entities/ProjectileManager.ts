// src/services/entities/ProjectileManager.ts

import type { GameState, Vector2D, ProjectileInstance, EnemyInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for all active projectiles, including movement
 * and collision detection.
 */
class ProjectileManager {
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { projectiles, enemies } = get();
        const updatedProjectiles: Record<string, ProjectileInstance> = { ...projectiles };
        const updatedEnemies: Record<string, EnemyInstance> = { ...enemies }; // Need to update enemies if they take damage
        let hasChanges = false;

        // Using a temporary list of projectile IDs to iterate over
        // to avoid issues if updatedProjectiles is modified during iteration
        const projectileIds = Object.keys(updatedProjectiles);

        for (const id of projectileIds) {
            const projectile = updatedProjectiles[id];
            // Check if projectile still exists (might have been removed by another projectile in this frame)
            if (!projectile) continue;

            const target = updatedEnemies[projectile.targetId]; // Check target from our local copy

            // If target is gone, mark projectile for removal and continue
            if (!target) {
                delete updatedProjectiles[id]; // Remove from our local copy
                hasChanges = true;
                continue;
            }

            const currentPosition = projectile.position;
            const targetPosition = target.position;
            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);

            // Check for hit
            if (distanceToMove >= distanceToTarget) {
                // Apply damage to the enemy directly in the local updatedEnemies copy
                const newEnemyHealth = target.currentHealth - projectile.damage;
                if (newEnemyHealth <= 0) {
                    delete updatedEnemies[target.id]; // Remove enemy if health drops to 0 or below
                } else {
                    updatedEnemies[target.id] = { ...target, currentHealth: newEnemyHealth }; // Update enemy health
                }
                delete updatedProjectiles[id]; // Remove projectile locally
                hasChanges = true;
                // TODO: Handle blast radius damage (would also modify updatedEnemies)
                continue;
            }

            // Move projectile towards target
            const direction = this.getDirection(currentPosition, targetPosition);
            const newPosition = {
                x: currentPosition.x + direction.x * distanceToMove,
                y: currentPosition.y + direction.y * distanceToMove,
            };

            // Check if position actually changed to avoid unnecessary updates
            if (newPosition.x !== currentPosition.x || newPosition.y !== currentPosition.y) {
                updatedProjectiles[id] = { ...projectile, position: newPosition };
                hasChanges = true;
            }
        }

        // After iterating through all projectiles, apply the batched updates in a single call.
        if (hasChanges) {
            set((state) => ({
                projectiles: updatedProjectiles,
                enemies: updatedEnemies, // Update enemies as part of the same batch
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

export default ProjectileManager;
