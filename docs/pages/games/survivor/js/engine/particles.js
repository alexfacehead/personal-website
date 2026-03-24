// particles.js — Pooled particle system with preset emitters

import { Pool } from './pool.js';

function createParticle() {
    return {
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        color: '#fff',
        size: 2, sizeEnd: 0,
        alpha: 1, alphaEnd: 0,
        rotation: 0, rotationSpeed: 0,
        alive: false, _poolIndex: 0
    };
}

function resetParticle(p) {
    p.x = p.y = p.vx = p.vy = 0;
    p.life = 0; p.maxLife = 1;
    p.color = '#fff';
    p.size = 2; p.sizeEnd = 0;
    p.alpha = 1; p.alphaEnd = 0;
    p.rotation = 0; p.rotationSpeed = 0;
}

export class ParticleSystem {
    constructor(maxParticles = 600) {
        this.pool = new Pool(createParticle, resetParticle, maxParticles);
    }

    emit(config) {
        const count = config.count || 10;
        for (let i = 0; i < count; i++) {
            const p = this.pool.acquire();
            const angle = config.angle != null
                ? config.angle + (Math.random() - 0.5) * (config.spread || 0)
                : Math.random() * Math.PI * 2;
            const speed = (config.speed || 50) + (Math.random() - 0.5) * (config.speedVar || 20);

            p.x = (config.x || 0) + (Math.random() - 0.5) * (config.posVar || 0);
            p.y = (config.y || 0) + (Math.random() - 0.5) * (config.posVar || 0);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 0;
            p.maxLife = (config.life || 0.5) + (Math.random() - 0.5) * (config.lifeVar || 0.2);
            p.color = Array.isArray(config.color)
                ? config.color[Math.floor(Math.random() * config.color.length)]
                : (config.color || '#fff');
            p.size = config.size || 3;
            p.sizeEnd = config.sizeEnd != null ? config.sizeEnd : 0;
            p.alpha = config.alpha != null ? config.alpha : 1;
            p.alphaEnd = config.alphaEnd != null ? config.alphaEnd : 0;
            p.rotation = Math.random() * Math.PI * 2;
            p.rotationSpeed = (config.rotationSpeed || 0) * (Math.random() > 0.5 ? 1 : -1);
        }
    }

    update(dt) {
        this.pool.forEach((p) => {
            p.life += dt;
            if (p.life >= p.maxLife) {
                this.pool.release(p);
                return;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98; // Friction
            p.vy *= 0.98;
            p.rotation += p.rotationSpeed * dt;
        });
    }

    render(ctx, renderer) {
        this.pool.forEachForward((p) => {
            if (!renderer.isVisible(p.x, p.y, p.size + 10)) return;

            const t = p.life / p.maxLife;
            const alpha = p.alpha + (p.alphaEnd - p.alpha) * t;
            const size = p.size + (p.sizeEnd - p.size) * t;

            if (alpha <= 0.01 || size <= 0.1) return;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        });
        ctx.globalAlpha = 1;
    }

    get count() {
        return this.pool.count;
    }

    clear() {
        this.pool.releaseAll();
    }
}

// --- Particle presets ---

export const FX = {
    enemyDeath(x, y, color) {
        return {
            x, y, count: 12,
            color: [color, '#fff', color],
            speed: 100, speedVar: 60,
            size: 4, sizeEnd: 0,
            life: 0.35, lifeVar: 0.15,
            alpha: 1, alphaEnd: 0,
            posVar: 5
        };
    },

    damage(x, y) {
        return {
            x, y, count: 4,
            color: '#fff',
            speed: 40, speedVar: 20,
            size: 2, sizeEnd: 0,
            life: 0.15, lifeVar: 0.05,
            alpha: 0.8, alphaEnd: 0
        };
    },

    xpPickup(x, y) {
        return {
            x, y, count: 6,
            color: ['#22c55e', '#4ade80', '#86efac'],
            speed: 30, speedVar: 20,
            size: 3, sizeEnd: 0,
            life: 0.3, lifeVar: 0.1,
            alpha: 1, alphaEnd: 0
        };
    },

    levelUp(x, y) {
        return {
            x, y, count: 30,
            color: ['#fbbf24', '#f59e0b', '#fff'],
            speed: 120, speedVar: 60,
            size: 5, sizeEnd: 1,
            life: 0.6, lifeVar: 0.3,
            alpha: 1, alphaEnd: 0,
            posVar: 10
        };
    },

    dodgeTrail(x, y) {
        return {
            x, y, count: 3,
            color: ['rgba(168,85,247,0.8)', 'rgba(139,92,246,0.6)'],
            speed: 10, speedVar: 10,
            size: 6, sizeEnd: 0,
            life: 0.2, lifeVar: 0.05,
            alpha: 0.6, alphaEnd: 0
        };
    },

    heal(x, y) {
        return {
            x, y, count: 8,
            color: ['#22c55e', '#4ade80'],
            speed: 50, speedVar: 30,
            size: 3, sizeEnd: 0,
            life: 0.5, lifeVar: 0.2,
            alpha: 1, alphaEnd: 0,
            angle: -Math.PI / 2, spread: Math.PI / 2
        };
    },

    explosion(x, y) {
        return {
            x, y, count: 25,
            color: ['#ef4444', '#f97316', '#fbbf24', '#fff'],
            speed: 150, speedVar: 80,
            size: 6, sizeEnd: 1,
            life: 0.4, lifeVar: 0.2,
            alpha: 1, alphaEnd: 0,
            posVar: 8
        };
    },

    frost(x, y) {
        return {
            x, y, count: 5,
            color: ['#67e8f9', '#22d3ee', '#a5f3fc'],
            speed: 20, speedVar: 15,
            size: 3, sizeEnd: 1,
            life: 0.6, lifeVar: 0.2,
            alpha: 0.7, alphaEnd: 0
        };
    },

    lightning(x, y) {
        return {
            x, y, count: 3,
            color: ['#fbbf24', '#fff'],
            speed: 60, speedVar: 40,
            size: 2, sizeEnd: 0,
            life: 0.15, lifeVar: 0.05,
            alpha: 1, alphaEnd: 0
        };
    }
};
