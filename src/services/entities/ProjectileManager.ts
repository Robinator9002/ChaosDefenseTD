// src/services/ProjectileManager.ts

import type { GameState, Vector2D } from '../../types/game';
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

        for (const projectile of Object.values(projectiles)) {
            const target = enemies[projectile.targetId];

            // If target is gone, remove projectile
            if (!target) {
                get().removeProjectile(projectile.id);
                continue;
            }

            const currentPosition = projectile.position;
            const targetPosition = target.position;
            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);

            // Check for hit
            if (distanceToMove >= distanceToTarget) {
                get().damageEnemy(target.id, projectile.damage);
                get().removeProjectile(projectile.id);
                // TODO: Handle blast radius damage
                continue;
            }

            // Move projectile towards target
            const direction = this.getDirection(currentPosition, targetPosition);
            const newPosition = {
                x: currentPosition.x + direction.x * distanceToMove,
                y: currentPosition.y + direction.y * distanceToMove,
            };

            // Update projectile state
            set((state) => ({
                projectiles: {
                    ...state.projectiles,
                    [projectile.id]: { ...projectile, position: newPosition },
                },
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
