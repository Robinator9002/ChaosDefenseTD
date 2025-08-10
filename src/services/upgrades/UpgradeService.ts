// src/services/UpgradeService.ts

import type { TowerInstance } from '../types/game';
import type { UpgradeConfig, UpgradeEffect, StatusEffectValue } from '../types/configs';

/**
 * A utility service for applying the effects of an upgrade to a tower instance.
 * This service is stateless and provides pure functions for calculating stat changes.
 */
class UpgradeService {
    /**
     * Applies a single upgrade configuration to a tower instance.
     * @param tower - The original tower instance.
     * @param upgrade - The upgrade configuration to apply.
     * @returns A new TowerInstance object with the upgraded stats.
     */
    public applyUpgrade(tower: TowerInstance, upgrade: UpgradeConfig): TowerInstance {
        // Create a deep copy of the tower to modify. This is crucial to avoid
        // mutating the original state object directly.
        const upgradedTower = JSON.parse(JSON.stringify(tower)) as TowerInstance;

        // Apply each effect defined in the upgrade
        upgrade.effects.forEach((effect: any) => {
            this.applyEffect(upgradedTower, effect);
        });

        return upgradedTower;
    }

    /**
     * Applies a single effect to the tower. This is the core logic that
     * modifies the tower's stats based on the effect's type and value.
     * @param tower - The tower instance to modify (mutated directly).
     * @param effect - The upgrade effect to apply.
     */
    private applyEffect(tower: TowerInstance, effect: UpgradeEffect): void {
        switch (effect.type) {
            case 'add_damage':
                tower.currentDamage += effect.value as number;
                console.log(`Applied 'add_damage'. New damage: ${tower.currentDamage}`);
                break;
            case 'add_range':
                tower.currentRange += effect.value as number;
                console.log(`Applied 'add_range'. New range: ${tower.currentRange}`);
                break;
            case 'multiply_fire_rate':
                // Note: Fire rate is attacks per second, so multiplying by > 1 is an increase.
                tower.currentFireRate *= effect.value as number;
                console.log(
                    `Applied 'multiply_fire_rate'. New fire rate: ${tower.currentFireRate}`,
                );
                break;

            // Note: 'add_blast_effect' will be handled by the StatusEffect system in Phase 3.
            // For now, we can log it to show it's being acknowledged.
            case 'add_blast_effect':
                console.log(
                    `Acknowledged 'add_blast_effect' for effect: ${
                        (effect.value as StatusEffectValue).id
                    }`,
                );
                break;

            default:
                console.warn(`Unknown upgrade effect type: ${(effect as any).type}`);
        }
    }
}

// Export a singleton instance of the service
export default new UpgradeService();
