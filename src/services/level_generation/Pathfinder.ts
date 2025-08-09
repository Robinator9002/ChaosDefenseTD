// src/services/Pathfinder.ts

import type { Vector2D } from '../../types/game';

/**
 * Represents a single node in the pathfinding grid.
 * It contains its position, cost, and a reference to its parent.
 */
class PathNode {
    public x: number;
    public y: number;
    public gCost: number; // Distance from starting node
    public hCost: number; // Heuristic distance to end node
    public parent: PathNode | null;

    constructor(x: number, y: number, parent: PathNode | null = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;
        this.gCost = 0;
        this.hCost = 0;
    }

    // fCost is the total cost of the node (gCost + hCost)
    get fCost(): number {
        return this.gCost + this.hCost;
    }

    // Helper to check for equality with another node
    equals(other: PathNode): boolean {
        return this.x === other.x && this.y === other.y;
    }
}

/**
 * A service that provides pathfinding capabilities using the A* algorithm.
 * It's designed to find the shortest path on a 2D grid while avoiding obstacles.
 */
class PathfinderService {
    /**
     * Finds a path from a start to an end point on a given grid.
     * @param grid A 2D array representing the map, where 0 is walkable and 1 is an obstacle.
     * @param start The starting coordinates {x, y}.
     * @param end The ending coordinates {x, y}.
     * @returns An array of Vector2D points representing the path, or an empty array if no path is found.
     */
    public findPath(grid: number[][], start: Vector2D, end: Vector2D): Vector2D[] {
        const gridWidth = grid[0]?.length || 0;
        const gridHeight = grid.length;

        const startNode = new PathNode(start.x, start.y);
        const endNode = new PathNode(end.x, end.y);

        const openList: PathNode[] = [startNode];
        const closedList: PathNode[] = [];

        while (openList.length > 0) {
            // Find the node with the lowest fCost in the open list
            let currentNode = openList[0];
            for (let i = 1; i < openList.length; i++) {
                if (
                    openList[i].fCost < currentNode.fCost ||
                    (openList[i].fCost === currentNode.fCost &&
                        openList[i].hCost < currentNode.hCost)
                ) {
                    currentNode = openList[i];
                }
            }

            // Move the current node from the open list to the closed list
            openList.splice(openList.indexOf(currentNode), 1);
            closedList.push(currentNode);

            // If we've reached the end, reconstruct and return the path
            if (currentNode.equals(endNode)) {
                return this.reconstructPath(currentNode);
            }

            // Get neighbors of the current node
            const neighbors = this.getNeighbors(currentNode, gridWidth, gridHeight);

            for (const neighbor of neighbors) {
                // Skip if the neighbor is an obstacle or is already in the closed list
                if (
                    grid[neighbor.y][neighbor.x] === 1 ||
                    closedList.some((n) => n.equals(neighbor))
                ) {
                    continue;
                }

                const newGCost = currentNode.gCost + this.getDistance(currentNode, neighbor);
                const isInOpenList = openList.some((n) => n.equals(neighbor));

                if (newGCost < neighbor.gCost || !isInOpenList) {
                    neighbor.gCost = newGCost;
                    neighbor.hCost = this.getDistance(neighbor, endNode);
                    neighbor.parent = currentNode;

                    if (!isInOpenList) {
                        openList.push(neighbor);
                    }
                }
            }
        }

        // No path found
        return [];
    }

    /**
     * Reconstructs the path from the end node back to the start node.
     * @param endNode The final node in the path.
     * @returns The path as an array of Vector2D points.
     */
    private reconstructPath(endNode: PathNode): Vector2D[] {
        const path: Vector2D[] = [];
        let currentNode: PathNode | null = endNode;
        while (currentNode !== null) {
            path.push({ x: currentNode.x, y: currentNode.y });
            currentNode = currentNode.parent;
        }
        return path.reverse();
    }

    /**
     * Gets the valid neighbors of a given node (up, down, left, right).
     */
    private getNeighbors(node: PathNode, width: number, height: number): PathNode[] {
        const neighbors: PathNode[] = [];
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 0, y: 1 }, // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 }, // Right
        ];

        for (const dir of directions) {
            const newX = node.x + dir.x;
            const newY = node.y + dir.y;

            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                neighbors.push(new PathNode(newX, newY));
            }
        }
        return neighbors;
    }

    /**
     * Calculates the Manhattan distance between two nodes (a common heuristic for A*).
     */
    private getDistance(nodeA: PathNode, nodeB: PathNode): number {
        const dstX = Math.abs(nodeA.x - nodeB.x);
        const dstY = Math.abs(nodeA.y - nodeB.y);
        // Using Manhattan distance for grid movement
        return dstX + dstY;
    }
}

// Export a singleton instance of the service
export default new PathfinderService();
