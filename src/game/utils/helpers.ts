// src/game/utils/helpers.ts

/**
 * This file contains pure utility functions that can be used anywhere in the application.
 * These helpers are deterministic and have no side effects, making them easy to test and reason about.
 */

import type { IVector } from '../../types';

/**
 * Calculates the Euclidean distance between two points (or objects with x, y properties).
 * This is a fundamental calculation used for determining tower range, projectile collision, etc.
 * @param obj1 - The first object with x and y coordinates.
 * @param obj2 - The second object with x and y coordinates.
 * @returns The distance between the two points.
 */
export const getDistance = (obj1: IVector, obj2: IVector): number => {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    // Using Math.sqrt is standard, but in performance-critical checks,
    // comparing squared distances (dx*dx + dy*dy) can be faster as it avoids the square root operation.
    return Math.sqrt(dx * dx + dy * dy);
};
