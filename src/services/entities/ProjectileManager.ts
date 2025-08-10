// src/services/entities/ProjectileManager.ts

import type { GameState, Vector2D, ProjectileInstance } from '../../types/game';
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
        const { projectiles, damageEnemy } = get(); // Get the damageEnemy action
        const updatedProjectiles: Record<string, ProjectileInstance> = { ...projectiles };
        let hasProjectileChanges = false;

        const projectileIds = Object.keys(updatedProjectiles);

        for (const id of projectileIds) {
            const projectile = updatedProjectiles[id];
            if (!projectile) continue;

            // Use the current state of enemies for targeting
            const target = get().enemies[projectile.targetId];

            if (!target) {
                // Target is already gone, remove the projectile
                delete updatedProjectiles[id];
                hasProjectileChanges = true;
                continue;
            }

            const currentPosition = projectile.position;
            const targetPosition = target.position;
            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);

            if (distanceToMove >= distanceToTarget) {
                // --- FIX: Use the centralized damageEnemy action ---
                // This ensures all logic for damaging/killing an enemy,
                // including awarding gold, is handled in one place.
                damageEnemy(projectile.targetId, projectile.damage);

                // TODO: Handle blast radius damage here later

                // The projectile has hit, so we remove it.
                delete updatedProjectiles[id];
                hasProjectileChanges = true;
                continue;
            }

            // Move the projectile towards the target
            const direction = this.getDirection(currentPosition, targetPosition);
            const newPosition = {
                x: currentPosition.x + direction.x * distanceToMove,
                y: currentPosition.y + direction.y * distanceToMove,
            };

            updatedProjectiles[id] = { ...projectile, position: newPosition };
            hasProjectileChanges = true;
        }

        if (hasProjectileChanges) {
            // Only update the projectiles slice of the state
            set({ projectiles: updatedProjectiles });
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
