// src/game/hooks/useGameLoop.ts

/**
 * This custom hook encapsulates the entire game loop logic.
 * It has been updated to accept and use the dynamically loaded game configuration.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Tower, Enemy, Projectile, Effect } from '../classes/indexClasses';
import { getDistance } from '../utils/helpers';
import { TILE_SIZE } from '../config/constants';
import type { GameConfig } from '../../App';
import type { IGameState, IGridCell, IPathPoint, IVector, IModalState } from '../../types';

interface IGameLoopProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    gameConfig: React.MutableRefObject<GameConfig | null>; // Now accepts the loaded config
    gameState: IGameState;
    setGameState: React.Dispatch<React.SetStateAction<IGameState>>;
    setModal: React.Dispatch<React.SetStateAction<IModalState>>;
    selectedTower: Tower | null;
    selectedTowerType: string | null;
    towers: React.MutableRefObject<Tower[]>;
    enemies: React.MutableRefObject<Enemy[]>;
    projectiles: React.MutableRefObject<Projectile[]>;
    effects: React.MutableRefObject<Effect[]>;
    grid: React.MutableRefObject<IGridCell[][]>;
    path: React.MutableRefObject<IPathPoint[]>;
    mousePos: React.MutableRefObject<IVector>;
    nextId: React.MutableRefObject<number>;
}

export const useGameLoop = ({
    canvasRef,
    gameConfig,
    gameState,
    setGameState,
    setModal,
    selectedTower,
    selectedTowerType,
    towers,
    enemies,
    projectiles,
    effects,
    grid,
    path,
    mousePos,
    nextId,
}: IGameLoopProps) => {
    const screenShake = useRef({ magnitude: 0, duration: 0 });
    const animationFrameId = useRef<number | null>(null);
    const lastTimeRef = useRef(0);

    const triggerScreenShake = useCallback((magnitude: number, duration: number) => {
        screenShake.current = { magnitude, duration };
    }, []);

    const createEffect = useCallback(
        (x: number, y: number, type: 'explosion' | 'particle', options: any) => {
            effects.current.push(new Effect(nextId.current++, x, y, type, options));
        },
        [nextId, effects],
    );

    const showTemporaryModal = useCallback(
        (title: string, text: string, color: string, duration: number) => {
            setModal({ show: true, title, text, color });
            setTimeout(() => setModal((prev) => ({ ...prev, show: false })), duration);
        },
        [setModal],
    );

    const loop = useCallback(
        (timestamp: number) => {
            // Guard clause: Do not run the loop if config hasn't loaded yet.
            if (!gameConfig.current) {
                animationFrameId.current = requestAnimationFrame(loop);
                return;
            }
            const config = gameConfig.current; // Alias for easier access

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const deltaTime = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            if (!gameState.gameOver && !gameState.victory) {
                // --- UPDATE LOGIC ---
                if (screenShake.current.duration > 0) screenShake.current.duration -= deltaTime;

                towers.current.forEach((tower) => {
                    tower.fireCooldown -= deltaTime;
                    if (
                        !tower.target ||
                        tower.target.isDead ||
                        getDistance(tower, tower.target) > tower.range
                    ) {
                        tower.findTarget(enemies.current);
                    }
                    if (tower.target && tower.fireCooldown <= 0) {
                        const typeData = config.towers[tower.type];
                        projectiles.current.push(
                            new Projectile(
                                nextId.current++,
                                tower.x,
                                tower.y,
                                tower.target,
                                tower.damage,
                                typeData.projectileSpeed,
                                typeData.projectileColor,
                                tower.type,
                                tower.aoeRadius || 0,
                            ),
                        );
                        tower.fireCooldown = 1 / tower.fireRate;
                    }
                });

                enemies.current.forEach((enemy) => {
                    if (enemy.pathIndex >= path.current.length - 1) {
                        enemy.isDead = true;
                        setGameState((prev) => ({
                            ...prev,
                            playerHealth: Math.max(0, prev.playerHealth - 1),
                        }));
                        triggerScreenShake(5, 0.2);
                        return;
                    }
                    const target = path.current[enemy.pathIndex + 1];
                    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                    enemy.x += Math.cos(angle) * enemy.speed * deltaTime * 10;
                    enemy.y += Math.sin(angle) * enemy.speed * deltaTime * 10;
                    if (getDistance(enemy, target) < enemy.speed) enemy.pathIndex++;
                });

                projectiles.current.forEach((p) => {
                    if (p.target.isDead) {
                        p.isDead = true;
                        return;
                    }
                    const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
                    p.x += Math.cos(angle) * p.speed * deltaTime * 20;
                    p.y += Math.sin(angle) * p.speed * deltaTime * 20;
                    if (getDistance(p, p.target) < p.target.size) {
                        p.isDead = true;
                        if (p.towerType === 'rocket') {
                            createEffect(p.x, p.y, 'explosion', { radius: p.aoeRadius });
                            triggerScreenShake(p.aoeRadius / 10, 0.1);
                            enemies.current.forEach((enemy) => {
                                if (getDistance(p, enemy) <= p.aoeRadius)
                                    enemy.takeDamage(p.damage);
                            });
                        } else {
                            p.target.takeDamage(p.damage);
                            createEffect(p.x, p.y, 'particle', { color: p.color, count: 5 });
                        }
                    }
                });

                effects.current.forEach((effect) => {
                    effect.life -= deltaTime;
                    if (effect.type === 'particle') {
                        effect.x! += effect.vx! * deltaTime;
                        effect.y! += effect.vy! * deltaTime;
                    }
                });

                // --- CLEANUP & STATE UPDATES ---
                let moneyEarned = 0;
                enemies.current = enemies.current.filter((e) => {
                    if (e.isDead) {
                        if (e.hp <= 0) {
                            moneyEarned += e.reward;
                            createEffect(e.x, e.y, 'particle', { color: e.color, count: 20 });
                        }
                        return false;
                    }
                    return true;
                });
                if (moneyEarned > 0)
                    setGameState((prev) => ({ ...prev, money: prev.money + moneyEarned }));

                projectiles.current = projectiles.current.filter((p) => !p.isDead);
                effects.current = effects.current.filter((e) => e.life > 0);

                // --- GAME STATE CHECKS ---
                if (gameState.playerHealth <= 0) {
                    setGameState((prev) => ({ ...prev, gameOver: true }));
                    setModal({
                        show: true,
                        title: 'GAME OVER',
                        text: `You survived ${gameState.wave} waves.`,
                        color: 'text-chaos-accent',
                    });
                }

                if (gameState.isWaveActive && enemies.current.length === 0) {
                    const waveBonus = 100 + gameState.wave * 10;
                    setGameState((prev) => ({
                        ...prev,
                        isWaveActive: false,
                        money: prev.money + waveBonus,
                    }));
                    if (gameState.wave >= config.waves.length) {
                        setGameState((prev) => ({ ...prev, victory: true }));
                        setModal({
                            show: true,
                            title: 'VICTORY!',
                            text: `You defeated all ${config.waves.length} waves!`,
                            color: 'text-yellow-400',
                        });
                    } else {
                        showTemporaryModal(
                            'WAVE COMPLETE!',
                            `You earned ${waveBonus} bonus money!`,
                            'text-green-400',
                            2000,
                        );
                    }
                }
            }

            // --- DRAWING LOGIC ---
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (screenShake.current.duration > 0) {
                ctx.save();
                ctx.translate(
                    (Math.random() - 0.5) * screenShake.current.magnitude,
                    (Math.random() - 0.5) * screenShake.current.magnitude,
                );
            }

            ctx.strokeStyle = '#0f3460';
            ctx.lineWidth = TILE_SIZE;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            if (path.current.length > 0) {
                ctx.moveTo(path.current[0].x, path.current[0].y);
                for (let i = 1; i < path.current.length; i++)
                    ctx.lineTo(path.current[i].x, path.current[i].y);
            }
            ctx.stroke();

            if (selectedTowerType) {
                const gridX = Math.floor(mousePos.current.x / TILE_SIZE);
                const gridY = Math.floor(mousePos.current.y / TILE_SIZE);
                const towerType = config.towers[selectedTowerType];
                if (grid.current[gridY]?.[gridX]) {
                    const canPlace =
                        !grid.current[gridY][gridX].isPath &&
                        !grid.current[gridY][gridX].isOccupied;
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = canPlace ? towerType.color : '#e94560';
                    ctx.beginPath();
                    ctx.arc(
                        gridX * TILE_SIZE + TILE_SIZE / 2,
                        gridY * TILE_SIZE + TILE_SIZE / 2,
                        TILE_SIZE * 0.4,
                        0,
                        Math.PI * 2,
                    );
                    ctx.fill();
                    ctx.strokeStyle = canPlace
                        ? 'rgba(255, 255, 255, 0.8)'
                        : 'rgba(233, 69, 96, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(
                        gridX * TILE_SIZE + TILE_SIZE / 2,
                        gridY * TILE_SIZE + TILE_SIZE / 2,
                        towerType.baseRange,
                        0,
                        Math.PI * 2,
                    );
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }

            if (selectedTower) {
                ctx.strokeStyle = 'rgba(220, 220, 220, 0.5)';
                ctx.fillStyle = 'rgba(220, 220, 220, 0.1)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(selectedTower.x, selectedTower.y, selectedTower.range, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            towers.current.forEach((t) => {
                ctx.fillStyle = config.towers[t.type].color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, TILE_SIZE * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(t.level + 1), t.x, t.y);
                if (t.target) {
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(t.x, t.y);
                    const angle = Math.atan2(t.target.y - t.y, t.target.x - t.x);
                    ctx.lineTo(
                        t.x + Math.cos(angle) * TILE_SIZE * 0.5,
                        t.y + Math.sin(angle) * TILE_SIZE * 0.5,
                    );
                    ctx.stroke();
                }
            });

            enemies.current.forEach((e) => {
                ctx.fillStyle = config.enemies[e.type].color;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.fill();
                const healthBarWidth = e.size * 2;
                ctx.fillStyle = '#333';
                ctx.fillRect(e.x - e.size, e.y - e.size - 10, healthBarWidth, 5);
                ctx.fillStyle = 'green';
                ctx.fillRect(e.x - e.size, e.y - e.size - 10, healthBarWidth * (e.hp / e.maxHp), 5);
            });

            projectiles.current.forEach((p) => {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });

            effects.current.forEach((effect) => {
                const progress = 1 - effect.life / effect.maxLife;
                ctx.globalAlpha = 1 - progress;
                if (effect.type === 'explosion') {
                    ctx.fillStyle = `rgba(255, 165, 0, ${1 - progress})`;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = effect.color!;
                    ctx.beginPath();
                    ctx.arc(effect.x!, effect.y!, effect.size!, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            });

            if (screenShake.current.duration > 0) ctx.restore();

            animationFrameId.current = requestAnimationFrame(loop);
        },
        [
            canvasRef,
            gameConfig,
            gameState,
            setGameState,
            setModal,
            selectedTower,
            selectedTowerType,
            towers,
            enemies,
            projectiles,
            effects,
            grid,
            path,
            mousePos,
            nextId,
            createEffect,
            triggerScreenShake,
            showTemporaryModal,
        ],
    );

    useEffect(() => {
        lastTimeRef.current = performance.now();
        animationFrameId.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [loop]);
};
