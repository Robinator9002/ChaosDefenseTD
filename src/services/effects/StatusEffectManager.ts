// src/services/entities/StatusEffectManager.ts

import type { GameState, EnemyInstance, ActiveStatusEffect } from '../../types/game';
import type { StatusEffectValue } from '../../types/configs';
import type { StoreApi } from 'zustand';
import type { GameActions } from '../../state/gameStore';
import { v4 as uuidv4 } from 'uuid';

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

            // Filter out expired effects and update time remaining on active ones.
            const activeEffects = enemy.effects
                .map((effect) => ({
                    ...effect,
                    timeRemaining: effect.timeRemaining - dt,
                }))
                .filter((effect) => effect.timeRemaining > 0);

            if (activeEffects.length !== enemy.effects.length) {
                updatedEnemies[enemy.id] = { ...enemy, effects: activeEffects };
                hasChanges = true;
            }

            // Handle Damage over Time (DoT) effects
            for (const effect of activeEffects) {
                if (effect.id === 'fire' || effect.id === 'bleed' || effect.id === 'poison') {
                    // Apply damage based on potency per second
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
        // 1. Check for Immunities
        if (target.config.base_stats.immunities?.includes(effectData.id)) {
            return; // The enemy is immune, do nothing.
        }

        // TODO: Handle chance-based application from upgrade configs

        const existingEffectIndex = target.effects.findIndex((e) => e.id === effectData.id);

        let newEffects: ActiveStatusEffect[];

        if (existingEffectIndex !== -1) {
            // --- Stacking Logic ---
            // For now, we'll just refresh the duration. More complex rules can be added here.
            newEffects = [...target.effects];
            newEffects[existingEffectIndex] = {
                ...newEffects[existingEffectIndex],
                potency: Math.max(newEffects[existingEffectIndex].potency, effectData.potency), // Take the stronger potency
                timeRemaining: Math.max(
                    newEffects[existingEffectIndex].timeRemaining,
                    effectData.duration,
                ), // Refresh to the longer duration
            };
        } else {
            // --- Apply New Effect ---
            const newEffect: ActiveStatusEffect = {
                ...effectData,
                timeRemaining: effectData.duration,
                sourceTowerId,
            };
            newEffects = [...target.effects, newEffect];
        }

        // Update the specific enemy in the store
        set((state) => ({
            enemies: {
                ...state.enemies,
                [target.id]: { ...target, effects: newEffects },
            },
        }));
    }
}

export default StatusEffectManager;
