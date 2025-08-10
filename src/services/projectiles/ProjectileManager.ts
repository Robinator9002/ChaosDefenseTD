// src/services/projectiles/ProjectileManager.ts

import type { GameState, Vector2D, ProjectileInstance, EnemyInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages logic for all active projectiles, including movement,
 * collision, pierce, chain, and blast radius.
 */
class ProjectileManager {
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { projectiles, enemies, damageEnemy } = get();
        const updatedProjectiles: Record<string, ProjectileInstance> = { ...projectiles };
        let hasProjectileChanges = false;

        for (const id of Object.keys(updatedProjectiles)) {
            const projectile = updatedProjectiles[id];
            if (!projectile) continue;

            let target = enemies[projectile.targetId];

            // --- Re-targeting Logic ---
            if (!target) {
                const newTarget = this.findNewTarget(
                    projectile.position,
                    enemies,
                    projectile.hitEnemyIds,
                    50,
                );
                if (newTarget) {
                    projectile.targetId = newTarget.id;
                    target = newTarget;
                } else {
                    // If no new target, projectile fizzles, remove it.
                    delete updatedProjectiles[id];
                    hasProjectileChanges = true;
                    continue;
                }
            }

            const currentPosition = projectile.position;
            const targetPosition = target.position;
            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);

            // --- Collision and Hit Logic ---
            if (distanceToMove >= distanceToTarget) {
                this.handleHit(projectile, target, get, set);
                hasProjectileChanges = true; // handleHit will modify the projectile state

                // Check if the projectile should be removed after the hit
                if ((projectile.pierce ?? 0) <= 0 && (projectile.chains ?? 0) <= 0) {
                    delete updatedProjectiles[id];
                }
                continue; // Move to next projectile
            }

            // --- Movement Logic ---
            const direction = this.getDirection(currentPosition, targetPosition);
            projectile.position = {
                x: currentPosition.x + direction.x * distanceToMove,
                y: currentPosition.y + direction.y * distanceToMove,
            };
            hasProjectileChanges = true;
        }

        if (hasProjectileChanges) {
            set({ projectiles: updatedProjectiles });
        }
    }

    /**
     * Handles all logic when a projectile hits a target enemy.
     */
    private handleHit(
        projectile: ProjectileInstance,
        target: EnemyInstance,
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
    ): void {
        const { enemies, damageEnemy } = get();

        // Add the primary target to the hit list to prevent re-hitting
        projectile.hitEnemyIds.push(target.id);

        // --- Blast Radius Logic ---
        if (projectile.blastRadius && projectile.blastRadius > 0) {
            const enemiesInBlast = Object.values(enemies).filter(
                (e) =>
                    !projectile.hitEnemyIds.includes(e.id) &&
                    this.getDistance(target.position, e.position) <= (projectile.blastRadius ?? 0),
            );

            for (const blastEnemy of enemiesInBlast) {
                damageEnemy(blastEnemy.id, projectile.damage); // Apply full damage in blast for now
                projectile.hitEnemyIds.push(blastEnemy.id);
                // TODO: Apply blast effects via StatusEffectManager in Phase 2
            }
        }

        // Damage the primary target
        damageEnemy(target.id, projectile.damage);
        // TODO: Apply on-hit effects via StatusEffectManager in Phase 2

        // --- Pierce & Chain Logic ---
        if ((projectile.pierce ?? 0) > 0) {
            projectile.pierce = (projectile.pierce ?? 0) - 1;
            // Projectile continues moving, no change in target
        } else if ((projectile.chains ?? 0) > 0) {
            const newTarget = this.findNewTarget(
                target.position,
                enemies,
                projectile.hitEnemyIds,
                200,
            );
            if (newTarget) {
                projectile.targetId = newTarget.id;
                projectile.chains = (projectile.chains ?? 0) - 1;
            } else {
                // No chain target found, mark for removal
                projectile.chains = 0;
            }
        }
    }

    /**
     * Finds the nearest valid new target for chaining or re-targeting.
     */
    private findNewTarget(
        fromPosition: Vector2D,
        allEnemies: Record<string, EnemyInstance>,
        hitIds: string[],
        range: number,
    ): EnemyInstance | null {
        let closestEnemy: EnemyInstance | null = null;
        let minDistanceSq = range * range;

        for (const enemy of Object.values(allEnemies)) {
            if (hitIds.includes(enemy.id)) continue;

            const distanceSq = this.getDistanceSq(fromPosition, enemy.position);
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestEnemy = enemy;
            }
        }
        return closestEnemy;
    }

    private getDirection(from: Vector2D, to: Vector2D): Vector2D {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return { x: 0, y: 0 };
        return { x: dx / length, y: dy / length };
    }

    private getDistance(a: Vector2D, b: Vector2D): number {
        return Math.sqrt(this.getDistanceSq(a, b));
    }

    private getDistanceSq(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
}

export default ProjectileManager;
