// src/services/effects/StatusEffectManager.ts

import type { GameState, EnemyInstance, ActiveStatusEffect } from '../../types/game';
import type { StatusEffectValue } from '../../types/configs';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';

type GameStore = GameState & GameActions;

/**
 * Manages the application, tracking, and resolution of all status effects
 * on enemies, respecting immunities and stacking rules.
 */
class StatusEffectManager {
    /**
     * The main update function, called every game tick.
     * It is responsible for decrementing effect durations and applying DoT damage.
     * @param get - Function to get the current game state.
     * @param set - Function to set the game state.
     * @param dt - Delta time since the last frame.
     */
    public update(
        get: StoreApi<GameStore>['getState'],
        set: StoreApi<GameStore>['setState'],
        dt: number,
    ): void {
        const { enemies, damageEnemy } = get();
        const updatedEnemies: Record<string, EnemyInstance> = {};
        let hasChanges = false;

        for (const enemy of Object.values(enemies)) {
            if (!enemy.effects || enemy.effects.length === 0) continue;

            // Update time remaining and filter out expired effects.
            const remainingEffects = enemy.effects
                .map((effect) => ({
                    ...effect,
                    timeRemaining: effect.timeRemaining - dt,
                }))
                .filter((effect) => effect.timeRemaining > 0);

            if (remainingEffects.length !== enemy.effects.length) {
                updatedEnemies[enemy.id] = { ...enemy, effects: remainingEffects };
                hasChanges = true;
            }

            // Handle Damage over Time (DoT) effects for currently active effects.
            const currentEffects = updatedEnemies[enemy.id]?.effects || enemy.effects;
            for (const effect of currentEffects) {
                if (effect.id === 'fire' || effect.id === 'bleed' || effect.id === 'poison') {
                    damageEnemy(enemy.id, effect.potency * dt);
                }
            }
        }

        if (hasChanges) {
            set((state) => ({
                enemies: { ...state.enemies, ...updatedEnemies },
            }));
        }
    }

    /**
     * Applies a status effect to a target enemy, checking for immunities and handling stacking.
     * @param target - The enemy to apply the effect to.
     * @param effectData - The configuration of the effect to apply.
     * @param sourceTowerId - The ID of the tower that sourced the effect.
     * @param set - The Zustand set function to update state.
     */
    public applyEffect(
        target: EnemyInstance,
        effectData: StatusEffectValue,
        sourceTowerId: string,
        set: StoreApi<GameStore>['setState'],
    ): void {
        // 1. Check for Immunities: If the enemy is immune, do nothing.
        if (target.config.base_stats.immunities?.includes(effectData.id)) {
            return;
        }

        const existingEffect = target.effects.find((e) => e.id === effectData.id);
        let newEffectsArray: ActiveStatusEffect[];

        if (existingEffect) {
            // --- Stacking Logic ---
            // Create a new array with the updated effect.
            newEffectsArray = target.effects.map((effect) => {
                if (effect.id === effectData.id) {
                    // Refresh duration and take the stronger potency.
                    return {
                        ...effect,
                        potency: Math.max(effect.potency, effectData.potency),
                        timeRemaining: Math.max(effect.timeRemaining, effectData.duration),
                        sourceTowerId, // Update source in case a different tower re-applies
                    };
                }
                return effect;
            });
        } else {
            // --- Apply New Effect ---
            const newEffect: ActiveStatusEffect = {
                ...effectData,
                timeRemaining: effectData.duration,
                sourceTowerId,
            };
            newEffectsArray = [...target.effects, newEffect];
        }

        // Update the specific enemy in the store to be efficient.
        set((state) => ({
            enemies: {
                ...state.enemies,
                [target.id]: { ...target, effects: newEffectsArray },
            },
        }));
    }
}

export default StatusEffectManager;
