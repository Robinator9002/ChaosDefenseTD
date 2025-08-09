// src/services/entities/TowerManager.ts

import type { GameState, TowerInstance, EnemyInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for all active towers, including targeting,
 * cooldowns, and firing projectiles.
 */
class TowerManager {
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { towers, enemies } = get();
        const enemyList = Object.values(enemies);

        // Create a mutable copy of the towers state to apply changes to.
        const updatedTowers: Record<string, TowerInstance> = { ...towers };
        let hasChanges = false;

        for (const tower of Object.values(updatedTowers)) {
            // 1. Update cooldown
            const oldCooldown = tower.cooldown;
            let newCooldown = Math.max(0, tower.cooldown - dt);

            // 2. If ready to fire, find a target
            if (newCooldown === 0 && tower.config.attack) {
                const target = this.findTarget(tower, enemyList);
                if (target) {
                    // 3. Fire projectile and reset cooldown
                    get().spawnProjectile(tower, target);
                    newCooldown = 1 / tower.currentFireRate;
                }
            }

            // 4. If the cooldown changed, update the tower instance in our copy.
            if (newCooldown !== oldCooldown) {
                updatedTowers[tower.id] = { ...tower, cooldown: newCooldown };
                hasChanges = true;
            }
        }

        // 5. After the loop, if any towers were changed, update the store ONCE.
        // This is the critical fix: we batch all updates for this manager
        // into a single `set` call, preventing the infinite render loop.
        if (hasChanges) {
            set((state) => ({
                towers: { ...state.towers, ...updatedTowers },
            }));
        }
    }

    /**
     * Finds a valid target for a given tower from a list of enemies.
     */
    private findTarget(tower: TowerInstance, enemies: EnemyInstance[]): EnemyInstance | null {
        if (enemies.length === 0 || !tower.config.attack) {
            return null;
        }

        const towerPosition = {
            x: tower.tilePosition.x * 32 + 16,
            y: tower.tilePosition.y * 32 + 16,
        };
        const rangeSq = tower.currentRange * tower.currentRange;

        // 1. Filter enemies that are in range
        const enemiesInRange = enemies.filter((enemy) => {
            const dx = towerPosition.x - enemy.position.x;
            const dy = towerPosition.y - enemy.position.y;
            return dx * dx + dy * dy <= rangeSq;
        });

        if (enemiesInRange.length === 0) {
            return null;
        }

        // 2. Sort by targeting priority (simplified for now)
        // TODO: Implement sorting based on tower.currentPersona
        enemiesInRange.sort((a, b) => b.pathIndex - a.pathIndex); // Target enemy furthest along path

        return enemiesInRange[0];
    }
}

export default TowerManager;
