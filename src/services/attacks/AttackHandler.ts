// src/services/attacks/AttackHandler.ts

import { useGameStore } from '../../state/gameStore';
import type { TowerInstance, EnemyInstance } from '../../types/game';
import { v4 as uuidv4 } from 'uuid';

/**
 * A service responsible for executing various types of tower attacks.
 * It acts as a central dispatcher, decoupling the TowerManager from the
 * specific implementation details of different attack mechanics.
 */
class AttackHandler {
    /**
     * Executes an attack for a given tower against a specific target.
     * @param tower - The tower instance that is attacking (with buffs applied).
     * @param target - The primary enemy target.
     */
    public executeAttack(tower: TowerInstance, target: EnemyInstance): void {
        const attackConfig = tower.config.attack;
        if (!attackConfig) {
            // This case should ideally not be hit if called from TowerManager correctly,
            // but it's a safe guard.
            return;
        }

        // The core of the handler: a switch based on the attack type.
        switch (attackConfig.type) {
            case 'standard_projectile':
                this.handleStandardProjectile(tower, target);
                break;

            case 'persistent_ground_aura':
                this.handleGroundAura(tower, target);
                break;

            case 'persistent_attached_aura':
                this.handleAttachedAura(tower, target);
                break;

            default:
                console.error(
                    `Unknown attack type: ${(attackConfig as any).type} for tower ${tower.id}`,
                );
        }
    }

    /**
     * Handles the creation of a standard projectile.
     * It calls the spawnProjectile action from the game store.
     */
    private handleStandardProjectile(tower: TowerInstance, target: EnemyInstance): void {
        const { spawnProjectile } = useGameStore.getState();
        spawnProjectile(tower, target);
    }

    /**
     * Handles the creation of a persistent aura on the ground (e.g., a firewall).
     * It calls the addAura action from the game store.
     */
    private handleGroundAura(tower: TowerInstance, target: EnemyInstance): void {
        const { addAura } = useGameStore.getState();
        const attackData = tower.config.attack?.data;

        if (!attackData) return;

        // Create a new aura instance and add it to the game state.
        addAura({
            id: uuidv4(),
            sourceTowerId: tower.id,
            position: target.position, // Aura is placed on the target's location
            radius: attackData.radius ?? 50,
            duration: attackData.duration ?? 5,
            timeRemaining: attackData.duration ?? 5,
            effects: attackData.effects ?? {},
            dps: attackData.dps ?? 0,
        });
    }

    /**
     * Handles attacks that directly apply a status effect to the target,
     * such as a curse or a direct debuff.
     */
    private handleAttachedAura(tower: TowerInstance, target: EnemyInstance): void {
        const { applyStatusEffect } = useGameStore.getState();
        const attackData = tower.config.attack?.data;
        if (!attackData?.effects) return;

        for (const effectKey in attackData.effects) {
            const effect = attackData.effects[effectKey];
            applyStatusEffect(target.id, effect, tower.id);
        }
    }
}

// Export a singleton instance of the service
export default new AttackHandler();
