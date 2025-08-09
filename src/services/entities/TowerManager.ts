// src/services/TowerManager.ts

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

        for (const tower of Object.values(towers)) {
            // 1. Update cooldown
            let newCooldown = tower.cooldown - dt;
            if (newCooldown < 0) newCooldown = 0;

            // 2. If ready to fire, find a target
            if (newCooldown === 0 && tower.config.attack) {
                const target = this.findTarget(tower, enemyList);
                if (target) {
                    // 3. Fire projectile and reset cooldown
                    get().spawnProjectile(tower, target);
                    newCooldown = 1 / tower.currentFireRate;
                }
            }

            // 4. Update tower state in the store
            // This is currently inefficient, we can optimize this later
            // by batching updates.
            set((state) => ({
                towers: { ...state.towers, [tower.id]: { ...tower, cooldown: newCooldown } },
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
        enemiesInRange.sort((a, b) => a.pathIndex - b.pathIndex); // Simple "first" priority

        return enemiesInRange[0];
    }
}

export default TowerManager;
