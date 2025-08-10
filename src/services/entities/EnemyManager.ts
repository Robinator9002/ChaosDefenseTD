// src/services/entities/EnemyManager.ts

import type { GameState, Vector2D, EnemyInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the logic for all active enemies, including calculating
 * stat modifications from effects, movement, and pathfinding.
 */
class EnemyManager {
    /**
     * The main update function for the enemy manager, called on every game tick.
     * @param get A function to get the current state from the Zustand store.
     * @param set A function to set the state in the Zustand store.
     * @param dt Delta time since the last frame.
     */
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { enemies, health } = get();
        const updatedEnemies: Record<string, EnemyInstance> = {};
        let updatedHealth = health;
        let hasChanges = false;

        for (const id in enemies) {
            let enemy = { ...enemies[id] };
            if (!enemy) continue;

            // --- REFACTOR START: Calculate final stats based on effects ---
            this.applyEffectModifiers(enemy);
            // --- REFACTOR END ---

            // Handle enemy reaching the end of the path
            if (enemy.pathIndex >= enemy.path.length - 1) {
                updatedHealth -= enemy.config.base_stats.damage;
                delete updatedEnemies[id]; // Mark for deletion
                hasChanges = true;
                continue;
            }

            // --- Move enemy logic using the (potentially modified) currentSpeed ---
            const targetPosition = enemy.path[enemy.pathIndex + 1];
            const distanceToMove = enemy.currentSpeed * dt;
            const distanceToTarget = this.getDistance(enemy.position, targetPosition);

            if (distanceToMove >= distanceToTarget) {
                enemy.position = { ...targetPosition };
                enemy.pathIndex++;
            } else {
                const direction = this.getDirection(enemy.position, targetPosition);
                enemy.position.x += direction.x * distanceToMove;
                enemy.position.y += direction.y * distanceToMove;
            }

            updatedEnemies[id] = enemy;
            hasChanges = true; // Assume changes if any enemies are present
        }

        if (hasChanges) {
            set({
                enemies: updatedEnemies,
                health: updatedHealth,
            });
        }
    }

    /**
     * Calculates and applies the modifications from active status effects
     * to an enemy's current stats for the frame.
     * @param enemy - The enemy instance to modify.
     */
    private applyEffectModifiers(enemy: EnemyInstance): void {
        // Reset to base stats at the start of the frame
        enemy.currentSpeed = enemy.config.base_stats.speed;
        enemy.currentArmor = enemy.config.base_stats.armor;

        if (!enemy.effects || enemy.effects.length === 0) {
            return;
        }

        // Calculate the total potency for stackable effects
        let totalSlowPotency = 0;

        for (const effect of enemy.effects) {
            switch (effect.id) {
                case 'slow':
                    totalSlowPotency += effect.potency;
                    break;
                case 'stun':
                    // A stun is a 100% slow
                    totalSlowPotency = 1;
                    break;
                case 'armor_break':
                    enemy.currentArmor -= effect.potency;
                    break;
                // Add cases for other effects like 'vulnerability' here
                // Note: Vulnerability will likely be checked in the damage calculation logic,
                // not as a direct stat modification on the enemy.
            }
        }

        // Apply the final calculated modifiers
        enemy.currentSpeed *= 1 - Math.min(totalSlowPotency, 1); // Cap slow at 100%
        enemy.currentArmor = Math.max(0, enemy.currentArmor); // Armor can't go below zero
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

export default EnemyManager;
