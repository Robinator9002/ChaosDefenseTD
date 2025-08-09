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
        const updatedEnemies: Record<string, EnemyInstance> = { ...enemies };
        let hasChanges = false;

        const projectileIds = Object.keys(updatedProjectiles);

        for (const id of projectileIds) {
            const projectile = updatedProjectiles[id];
            if (!projectile) continue;

            const target = updatedEnemies[projectile.targetId];

            if (!target) {
                delete updatedProjectiles[id];
                hasChanges = true;
                continue;
            }

            const currentPosition = projectile.position;
            const targetPosition = target.position;
            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);

            if (distanceToMove >= distanceToTarget) {
                const newEnemyHealth = target.currentHp - projectile.damage; // Using currentHp as per type definition
                if (newEnemyHealth <= 0) {
                    delete updatedEnemies[target.id];
                } else {
                    updatedEnemies[target.id] = { ...target, currentHp: newEnemyHealth };
                }
                delete updatedProjectiles[id];
                hasChanges = true;
                // TODO: Handle blast radius damage (would also modify updatedEnemies)
                continue;
            }

            const direction = this.getDirection(currentPosition, targetPosition);
            const newPosition = {
                x: currentPosition.x + direction.x * distanceToMove,
                y: currentPosition.y + direction.y * distanceToMove,
            };

            if (newPosition.x !== currentPosition.x || newPosition.y !== currentPosition.y) {
                updatedProjectiles[id] = { ...projectile, position: newPosition };
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // FIX: Pass the new partial state object directly
            set({
                projectiles: updatedProjectiles,
                enemies: updatedEnemies,
            });
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
