// src/services/projectiles/AuraManager.ts

import type { GameState, Vector2D, EnemyInstance, AuraInstance } from '../../types/game';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the lifecycle and effects of all active AuraInstances in the game.
 */
class AuraManager {
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { auras, enemies, damageEnemy, applyStatusEffect } = get();
        const updatedAuras: Record<string, AuraInstance> = { ...auras };
        const enemyList = Object.values(enemies);
        let hasChanges = false;

        for (const id of Object.keys(updatedAuras)) {
            const aura = updatedAuras[id];
            if (!aura) continue;

            aura.timeRemaining -= dt;
            if (aura.timeRemaining <= 0) {
                delete updatedAuras[id];
                hasChanges = true;
                continue;
            }

            const enemiesInRadius = enemyList.filter(
                (enemy) => this.getDistance(aura.position, enemy.position) <= aura.radius,
            );

            for (const enemy of enemiesInRadius) {
                if (aura.dps > 0) {
                    damageEnemy(enemy.id, aura.dps * dt);
                }

                // --- FINAL STEP: Apply aura status effects ---
                if (Object.keys(aura.effects).length > 0) {
                    for (const effectKey in aura.effects) {
                        applyStatusEffect(enemy.id, aura.effects[effectKey], aura.sourceTowerId);
                    }
                }
            }
        }

        if (hasChanges) {
            set({ auras: updatedAuras });
        }
    }

    private getDistance(a: Vector2D, b: Vector2D): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default AuraManager;
