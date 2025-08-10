// src/services/projectiles/ProjectileManager.ts

import type { GameState, Vector2D, ProjectileInstance, EnemyInstance } from '../../types/game';
import type { StatusEffectValue } from '../../types/configs';
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
        const { projectiles, enemies, damageEnemy, applyStatusEffect } = get();
        const updatedProjectiles: Record<string, ProjectileInstance> = { ...projectiles };
        let hasChanges = false;

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
                    // Fizzle: no target found.
                    delete updatedProjectiles[id];
                    hasChanges = true;
                    continue;
                }
            }

            const currentPosition = projectile.position;
            const targetPosition = target.position;
            const distanceToMove = projectile.speed * dt;
            const distanceToTarget = this.getDistance(currentPosition, targetPosition);

            // --- Collision and Movement Logic ---
            if (distanceToMove >= distanceToTarget) {
                // On collision, move projectile exactly to target's last position
                projectile.position = { ...targetPosition };

                // Handle the hit, which might modify the projectile (pierce/chain)
                this.handleHit(projectile, target, get);

                // If the projectile is expended (no pierce/chains left), remove it.
                if ((projectile.pierce ?? 0) <= 0 && (projectile.chains ?? 0) <= 0) {
                    delete updatedProjectiles[id];
                    hasChanges = true;
                    continue; // Done with this projectile.
                }
            }

            // --- Normal Movement ---
            // This now correctly runs for piercing projectiles AFTER they hit,
            // moving them past their last target.
            const direction = this.getDirection(projectile.position, target.position);
            projectile.position.x += direction.x * distanceToMove;
            projectile.position.y += direction.y * distanceToMove;
            hasChanges = true;
        }

        if (hasChanges) {
            set({ projectiles: updatedProjectiles });
        }
    }

    /**
     * Handles all effects when a projectile hits a target enemy.
     * This function modifies the projectile's state (pierce/chains) directly.
     */
    private handleHit(
        projectile: ProjectileInstance,
        target: EnemyInstance,
        get: StoreApi<GameStore>['getState'],
    ): void {
        const { enemies, damageEnemy, applyStatusEffect } = get();
        const sourceTowerId = projectile.sourceTowerId;

        // --- Primary Target Hit ---
        // Ensure we don't hit the same target multiple times with one projectile.
        if (!projectile.hitEnemyIds.includes(target.id)) {
            damageEnemy(target.id, projectile.damage);
            projectile.effectsToApply?.forEach((effect: StatusEffectValue) => {
                applyStatusEffect(target.id, effect, sourceTowerId);
            });
            projectile.hitEnemyIds.push(target.id);
        }

        // --- Blast Radius Logic ---
        if (projectile.blastRadius && projectile.blastRadius > 0) {
            const enemiesInBlast = Object.values(enemies).filter(
                (e) =>
                    this.getDistance(target.position, e.position) <= (projectile.blastRadius ?? 0),
            );

            for (const blastEnemy of enemiesInBlast) {
                if (!projectile.hitEnemyIds.includes(blastEnemy.id)) {
                    damageEnemy(blastEnemy.id, projectile.damage);
                    projectile.onBlastEffects?.forEach((effect: StatusEffectValue) => {
                        applyStatusEffect(blastEnemy.id, effect, sourceTowerId);
                    });
                    projectile.hitEnemyIds.push(blastEnemy.id);
                }
            }
        }

        // --- Pierce & Chain State Update ---
        if ((projectile.pierce ?? 0) > 0) {
            projectile.pierce! -= 1;
        } else if ((projectile.chains ?? 0) > 0) {
            const newTarget = this.findNewTarget(
                target.position,
                enemies,
                projectile.hitEnemyIds,
                200,
            );
            if (newTarget) {
                projectile.targetId = newTarget.id;
                projectile.chains! -= 1;
            } else {
                // No chain target found, mark projectile as expended.
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
