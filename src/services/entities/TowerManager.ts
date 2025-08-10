// src/services/entities/TowerManager.ts

import type { GameState, TowerInstance, EnemyInstance, Vector2D } from '../../types/game';
import type { StatusEffectValue } from '../../types/configs';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';
import AttackHandler from '../attacks/AttackHandler';

type GameStore = GameState & GameActions;

/**
 * Manages logic for all active towers, including targeting, cooldowns,
 * applying passive auras, and delegating attacks.
 */
class TowerManager {
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { towers, enemies, applyStatusEffect } = get();
        const enemyList = Object.values(enemies);
        const supportTowers = Object.values(towers).filter((t) => t.config.auras);

        const updatedTowers: Record<string, TowerInstance> = {};
        let hasChanges = false;

        for (const tower of Object.values(towers)) {
            // --- PASSIVE AURA LOGIC ---
            if (tower.config.auras) {
                tower.config.auras.forEach((aura) => {
                    if (aura.target_type === 'ENEMY') {
                        const enemiesInAura = enemyList.filter(
                            (enemy) =>
                                this.getDistance(
                                    tower.tilePosition,
                                    this.worldToTile(enemy.position),
                                ) <=
                                aura.range / 32,
                        );
                        enemiesInAura.forEach((enemy) => {
                            for (const effectKey in aura.effects) {
                                // --- FIX: Construct the correct StatusEffectValue object ---
                                const effectData = aura.effects[effectKey];
                                const statusEffect: StatusEffectValue = {
                                    id: effectKey, // The key is the effect's ID
                                    potency: effectData.potency,
                                    duration: effectData.duration,
                                };
                                applyStatusEffect(enemy.id, statusEffect, tower.id);
                            }
                        });
                    }
                });
            }

            // --- ACTIVE ATTACK LOGIC ---
            let towerDidChange = false;
            let newCooldown = Math.max(0, tower.cooldown - dt);

            if (newCooldown !== tower.cooldown) {
                towerDidChange = true;
            }

            if (newCooldown === 0 && tower.config.attack) {
                const target = this.findTarget(tower, enemyList);

                if (target) {
                    const buffedTower = this.applySupportBuffs(tower, supportTowers);
                    AttackHandler.executeAttack(buffedTower, target);

                    const fireRate = buffedTower.currentFireRate;
                    newCooldown = fireRate > 0 ? 1 / fireRate : 1.0;
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
                if (aura.target_type === 'TOWER' && distance * 32 <= aura.range) {
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

    private findTarget(tower: TowerInstance, enemies: EnemyInstance[]): EnemyInstance | null {
        if (enemies.length === 0) return null;

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

        if (enemiesInRange.length === 0) return null;

        enemiesInRange.sort((a, b) => b.pathIndex - a.pathIndex);
        return enemiesInRange[0];
    }

    private worldToTile(worldPos: Vector2D): Vector2D {
        const TILE_SIZE = 32;
        return {
            x: Math.floor(worldPos.x / TILE_SIZE),
            y: Math.floor(worldPos.y / TILE_SIZE),
        };
    }

    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default TowerManager;
