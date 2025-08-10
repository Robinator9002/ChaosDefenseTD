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
        const updatedProjectiles: Record<string, ProjectileInstance> = { ...get().projectiles };
        let hasProjectileChanges = false;

        for (const id of Object.keys(updatedProjectiles)) {
            const projectile = updatedProjectiles[id];
            if (!projectile) continue;

            let target = get().enemies[projectile.targetId];

            if (!target) {
                const newTarget = this.findNewTarget(
                    projectile.position,
                    get().enemies,
                    projectile.hitEnemyIds,
                    50,
                );
                if (newTarget) {
                    projectile.targetId = newTarget.id;
                    target = newTarget;
                } else {
                    delete updatedProjectiles[id];
                    hasProjectileChanges = true;
                    continue;
                }
            }

            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(projectile.position, target.position);

            if (distanceToMove >= distanceToTarget) {
                this.handleHit(projectile, target, get);
                hasProjectileChanges = true;

                if ((projectile.pierce ?? 0) <= 0 && (projectile.chains ?? 0) <= 0) {
                    delete updatedProjectiles[id];
                }
                continue;
            }

            const direction = this.getDirection(projectile.position, target.position);
            projectile.position.x += direction.x * distanceToMove;
            projectile.position.y += direction.y * distanceToMove;
            hasProjectileChanges = true;
        }

        if (hasProjectileChanges) {
            set({ projectiles: updatedProjectiles });
        }
    }

    private handleHit(
        projectile: ProjectileInstance,
        target: EnemyInstance,
        get: StoreApi<GameStore>['getState'],
    ): void {
        const { enemies, damageEnemy, applyStatusEffect } = get();
        const sourceTowerId = projectile.sourceTowerId; // Assuming we add this to ProjectileInstance

        projectile.hitEnemyIds.push(target.id);
        damageEnemy(target.id, projectile.damage);
        // --- FINAL STEP: Apply on-hit effects ---
        projectile.effectsToApply?.forEach((effect) => {
            applyStatusEffect(target.id, effect, sourceTowerId);
        });

        if (projectile.blastRadius && projectile.blastRadius > 0) {
            const enemiesInBlast = Object.values(enemies).filter(
                (e) =>
                    !projectile.hitEnemyIds.includes(e.id) &&
                    this.getDistance(target.position, e.position) <= (projectile.blastRadius ?? 0),
            );

            for (const blastEnemy of enemiesInBlast) {
                damageEnemy(blastEnemy.id, projectile.damage);
                projectile.hitEnemyIds.push(blastEnemy.id);
                // --- FINAL STEP: Apply on-blast effects ---
                projectile.onBlastEffects?.forEach((effect) => {
                    applyStatusEffect(blastEnemy.id, effect, sourceTowerId);
                });
            }
        }

        if ((projectile.pierce ?? 0) > 0) {
            projectile.pierce = (projectile.pierce ?? 0) - 1;
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
                projectile.chains = 0;
            }
        }
    }

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

    private getDirection = (from: Vector2D, to: Vector2D): Vector2D => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return length === 0 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
    };

    private getDistance = (a: Vector2D, b: Vector2D): number => Math.sqrt(this.getDistanceSq(a, b));
    private getDistanceSq = (a: Vector2D, b: Vector2D): number =>
        (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

export default ProjectileManager;
