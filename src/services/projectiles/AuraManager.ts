// src/services/projectiles/AuraManager.ts

import type { GameState, Vector2D, EnemyInstance, AuraInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

// Define the combined type for the game store for easier access.
type GameStore = GameState & GameActions;

/**
 * Manages the lifecycle and effects of all active AuraInstances in the game.
 * This includes persistent ground effects like firewalls or other area-of-effect zones.
 */
class AuraManager {
    /**
     * The main update function for the aura manager, called on every game tick.
     * @param get A function to get the current state from the Zustand store.
     * @param set A function to set the state in the Zustand store.
     * @param dt Delta time since the last frame, in seconds.
     */
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { auras, enemies, damageEnemy } = get();
        const updatedAuras: Record<string, AuraInstance> = { ...auras };
        const enemyList = Object.values(enemies);
        let hasChanges = false;

        // Iterate over a copy of the aura IDs to allow for safe deletion.
        for (const id of Object.keys(updatedAuras)) {
            const aura = updatedAuras[id];
            if (!aura) continue;

            // 1. Decrement duration and remove expired auras.
            aura.timeRemaining -= dt;
            if (aura.timeRemaining <= 0) {
                delete updatedAuras[id];
                hasChanges = true;
                continue; // Skip to the next aura.
            }

            // 2. Find all enemies within the aura's radius.
            const enemiesInRadius = enemyList.filter(
                (enemy) => this.getDistance(aura.position, enemy.position) <= aura.radius,
            );

            // 3. Apply effects to enemies in the radius.
            for (const enemy of enemiesInRadius) {
                // Apply direct damage per second (DPS).
                if (aura.dps > 0) {
                    // The damageEnemy action already handles all the complex logic
                    // of health reduction, enemy removal, and awarding gold.
                    damageEnemy(enemy.id, aura.dps * dt);
                }
            }
        }

        // 4. If any auras were removed, update the state in a single batch.
        if (hasChanges) {
            set({ auras: updatedAuras });
        }
    }

    /**
     * Calculates the Euclidean distance between two points.
     * @param a - The first point.
     * @param b - The second point.
     * @returns The distance between a and b.
     */
    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// FIX: Export the class itself, not an instance of it.
// This allows it to be used as a type and to be constructed with `new`.
export default AuraManager;
