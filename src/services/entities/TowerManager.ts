// src/services/entities/TowerManager.ts

import type { GameState, TowerInstance, EnemyInstance, Vector2D } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';
import AttackHandler from '../attacks/AttackHandler'; // Import the AttackHandler

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

            // If ready to fire, find a target and execute the attack.
            if (newCooldown === 0 && (tower.config.attack || tower.config.auras)) {
                const target = this.findTarget(tower, enemyList);

                if (target) {
                    // --- REFACTOR START ---
                    // 1. Calculate the tower's final stats, including buffs from nearby support towers.
                    const buffedTower = this.applySupportBuffs(tower, supportTowers);

                    // 2. Delegate the attack to the AttackHandler.
                    // The handler will determine the attack type (projectile, aura, etc.)
                    AttackHandler.executeAttack(buffedTower, target);

                    // 3. Reset cooldown based on the *buffed* fire rate.
                    newCooldown = 1 / buffedTower.currentFireRate;
                    towerDidChange = true;
                    // --- REFACTOR END ---
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

    /**
     * Calculates a tower's final stats for an attack after applying buffs
     * from all nearby friendly support towers.
     * @param towerToBuff - The tower that is about to attack.
     * @param allSupportTowers - A list of all support towers on the map.
     * @returns A new TowerInstance object with temporary, buffed stats.
     */
    private applySupportBuffs(
        towerToBuff: TowerInstance,
        allSupportTowers: TowerInstance[],
    ): TowerInstance {
        // Start with a clone of the tower's current state.
        const buffedTower = { ...towerToBuff };

        for (const supportTower of allSupportTowers) {
            // A tower cannot buff itself.
            if (supportTower.id === towerToBuff.id) continue;

            const distance = this.getDistance(towerToBuff.tilePosition, supportTower.tilePosition);

            // Check each aura on the support tower.
            supportTower.config.auras?.forEach((aura) => {
                // Is the attacking tower in range of this support aura?
                if (distance * 32 <= aura.range) {
                    // Multiply by tile size for world units
                    // Apply each effect from the aura.
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
                            // Add cases for other potential buffs like effect_potency_boost
                        }
                    }
                }
            });
        }

        return buffedTower;
    }

    /**
     * Finds a valid target for a given tower from a list of enemies.
     */
    private findTarget(tower: TowerInstance, enemies: EnemyInstance[]): EnemyInstance | null {
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

        // TODO: Implement sorting based on tower.currentPersona
        enemiesInRange.sort((a, b) => b.pathIndex - a.pathIndex);

        return enemiesInRange[0];
    }

    /**
     * Calculates the tile-based distance between two vectors.
     */
    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default TowerManager;
