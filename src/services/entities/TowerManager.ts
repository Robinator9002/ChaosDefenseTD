// src/services/entities/TowerManager.ts

import type { GameState, TowerInstance, EnemyInstance, Vector2D } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';
import AttackHandler from '../attacks/AttackHandler';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for all active towers, including targeting,
 * cooldowns, and delegating attacks to the AttackHandler.
 */
class TowerManager {
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { towers, enemies } = get();
        const enemyList = Object.values(enemies);
        const supportTowers = Object.values(towers).filter((t) => t.config.auras);

        const updatedTowers: Record<string, TowerInstance> = {};
        let hasChanges = false;

        for (const tower of Object.values(towers)) {
            let towerDidChange = false;
            let newCooldown = Math.max(0, tower.cooldown - dt);

            if (newCooldown !== tower.cooldown) {
                towerDidChange = true;
            }

            // A tower can only act if its cooldown is 0 AND it has an attack configuration.
            // Support-only towers will correctly be skipped here.
            if (newCooldown === 0 && tower.config.attack) {
                const target = this.findTarget(tower, enemyList);

                if (target) {
                    const buffedTower = this.applySupportBuffs(tower, supportTowers);
                    AttackHandler.executeAttack(buffedTower, target);

                    // FIX: Safely calculate the new cooldown, preventing division by zero.
                    const fireRate = buffedTower.currentFireRate;
                    if (fireRate > 0) {
                        newCooldown = 1 / fireRate;
                    } else {
                        // For single-shot abilities or auras with no fire rate, provide a default.
                        newCooldown = 1.0;
                    }
                    towerDidChange = true;
                }
            }

            if (towerDidChange) {
                updatedTowers[tower.id] = { ...tower, cooldown: newCooldown };
                hasChanges = true;
            }
        }

        if (hasChanges) {
            set((state) => ({
                towers: { ...state.towers, ...updatedTowers },
            }));
        }
    }

    private applySupportBuffs(
        towerToBuff: TowerInstance,
        allSupportTowers: TowerInstance[],
    ): TowerInstance {
        const buffedTower = { ...towerToBuff };

        for (const supportTower of allSupportTowers) {
            if (supportTower.id === towerToBuff.id) continue;

            const distance = this.getDistance(towerToBuff.tilePosition, supportTower.tilePosition);

            supportTower.config.auras?.forEach((aura) => {
                if (distance * 32 <= aura.range) {
                    for (const effectKey in aura.effects) {
                        const effect = aura.effects[effectKey];
                        switch (effectKey) {
                            case 'damage_boost':
                                buffedTower.currentDamage *= effect.potency;
                                break;
                            case 'fire_rate_boost':
                                buffedTower.currentFireRate *= effect.potency;
                                break;
                            case 'range_boost':
                                buffedTower.currentRange *= effect.potency;
                                break;
                        }
                    }
                }
            });
        }
        return buffedTower;
    }

    /**
     * Finds a valid target for a given tower from a list of enemies.
     * This is a pure utility function; it does not decide IF a tower can attack.
     */
    private findTarget(tower: TowerInstance, enemies: EnemyInstance[]): EnemyInstance | null {
        // FIX: Removed the '!tower.config.attack' check. This function's only job
        // is to find an enemy in range, not to validate the tower's ability to attack.
        if (enemies.length === 0) {
            return null;
        }

        const towerPosition = {
            x: tower.tilePosition.x * 32 + 16,
            y: tower.tilePosition.y * 32 + 16,
        };
        const rangeSq = tower.currentRange * tower.currentRange;

        const enemiesInRange = enemies.filter((enemy) => {
            const dx = towerPosition.x - enemy.position.x;
            const dy = towerPosition.y - enemy.position.y;
            return dx * dx + dy * dy <= rangeSq;
        });

        if (enemiesInRange.length === 0) {
            return null;
        }

        enemiesInRange.sort((a, b) => b.pathIndex - a.pathIndex);
        return enemiesInRange[0];
    }

    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default TowerManager;
