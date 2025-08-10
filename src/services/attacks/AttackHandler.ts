// src/services/attacks/AttackHandler.ts

import { useGameStore } from '../../state/gameStore';
import type { TowerInstance, EnemyInstance } from '../../types/game';
import { v4 as uuidv4 } from 'uuid';

/**
 * A service responsible for executing various types of tower attacks.
 */
class AttackHandler {
    public executeAttack(tower: TowerInstance, target: EnemyInstance): void {
        const attackConfig = tower.config.attack;
        if (!attackConfig) return;

        switch (attackConfig.type) {
            case 'standard_projectile':
                this.handleStandardProjectile(tower, target);
                break;

            case 'persistent_ground_aura':
                this.handleGroundAura(tower, target);
                break;

            // --- FINAL STEP: Implement attached aura logic ---
            case 'persistent_attached_aura':
                this.handleAttachedAura(tower, target);
                break;

            default:
                console.error(`Unknown attack type: ${(attackConfig as any).type}`);
        }
    }

    private handleStandardProjectile(tower: TowerInstance, target: EnemyInstance): void {
        const { spawnProjectile } = useGameStore.getState();
        spawnProjectile(tower, target);
    }

    private handleGroundAura(tower: TowerInstance, target: EnemyInstance): void {
        const { addAura } = useGameStore.getState();
        const attackData = tower.config.attack?.data;
        if (!attackData) return;

        addAura({
            id: uuidv4(),
            sourceTowerId: tower.id,
            position: target.position,
            radius: attackData.radius ?? 50,
            duration: attackData.duration ?? 5,
            timeRemaining: attackData.duration ?? 5,
            effects: attackData.effects ?? {},
            dps: attackData.dps ?? 0,
        });
    }

    /**
     * Handles attacks that directly apply a status effect to the target.
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

export default new AttackHandler();
