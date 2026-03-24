// weapons.js — All weapon implementations: orbital, missile, nova, lightning, frost, beam

import { getWeaponStats, WEAPON_DEFS } from '../data/weapons.js';
import { initProjectile } from '../entities/projectile.js';
import { applyDamageToEnemy, applyKnockback, applySlow, applyFreeze, applyStun } from './combat.js';
import { FX } from '../engine/particles.js';

export class WeaponManager {
    constructor() {
        this.weapons = new Map(); // id -> { level, timer, state }
    }

    addWeapon(id) {
        if (this.weapons.has(id)) return false;
        this.weapons.set(id, { level: 1, timer: 0, state: {} });
        return true;
    }

    upgradeWeapon(id) {
        const w = this.weapons.get(id);
        if (!w) return false;
        const def = WEAPON_DEFS[id];
        if (w.level >= def.maxLevel) return false;
        w.level++;
        return true;
    }

    hasWeapon(id) {
        return this.weapons.has(id);
    }

    getLevel(id) {
        return this.weapons.get(id)?.level || 0;
    }

    update(dt, player, enemies, projectilePool, spatialHash, particles, audio, renderer) {
        for (const [id, weapon] of this.weapons) {
            const stats = getWeaponStats(id, weapon.level);
            const cdr = player.cooldownReduction || 0;

            switch (id) {
                case 'orbital':
                    this._updateOrbital(dt, weapon, stats, player, enemies, spatialHash, particles, audio);
                    break;
                case 'missile':
                    this._updateMissile(dt, weapon, stats, player, enemies, projectilePool, cdr, particles, audio);
                    break;
                case 'nova':
                    this._updateNova(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'lightning':
                    this._updateLightning(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'frost':
                    this._updateFrost(dt, weapon, stats, player, enemies, spatialHash, particles, audio);
                    break;
                case 'beam':
                    this._updateBeam(dt, weapon, stats, player, enemies, spatialHash, particles, audio, renderer);
                    break;
            }
        }
    }

    _updateOrbital(dt, weapon, stats, player, enemies, spatialHash, particles, audio) {
        if (!weapon.state.angle) weapon.state.angle = 0;
        weapon.state.angle += stats.speed * dt;

        const count = stats.count;
        for (let i = 0; i < count; i++) {
            const angle = weapon.state.angle + (Math.PI * 2 * i) / count;
            const orbX = player.x + Math.cos(angle) * stats.radius;
            const orbY = player.y + Math.sin(angle) * stats.radius;

            // Check collision with enemies
            const nearby = spatialHash.queryRadius(orbX, orbY, stats.orbSize + 10);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                const dx = enemy.x - orbX;
                const dy = enemy.y - orbY;
                if (dx * dx + dy * dy < (stats.orbSize + enemy.radius) * (stats.orbSize + enemy.radius)) {
                    const result = applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    if (result.dealt > 0) {
                        applyKnockback(enemy, orbX, orbY, 80);
                    }
                }
            }
        }

        weapon.state.orbPositions = [];
        for (let i = 0; i < count; i++) {
            const angle = weapon.state.angle + (Math.PI * 2 * i) / count;
            weapon.state.orbPositions.push({
                x: player.x + Math.cos(angle) * stats.radius,
                y: player.y + Math.sin(angle) * stats.radius,
                size: stats.orbSize
            });
        }
    }

    _updateMissile(dt, weapon, stats, player, enemies, projectilePool, cdr, particles, audio) {
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;

            // Find nearest enemies
            const targets = [];
            enemies.forEachForward((e) => {
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                targets.push({ enemy: e, dist: dx * dx + dy * dy });
            });
            targets.sort((a, b) => a.dist - b.dist);

            const count = Math.min(stats.count, targets.length);
            for (let i = 0; i < count; i++) {
                const target = targets[i % targets.length].enemy;
                const dx = target.x - player.x;
                const dy = target.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                const proj = projectilePool.acquire();
                initProjectile(proj, {
                    x: player.x,
                    y: player.y,
                    dirX: dx / dist,
                    dirY: dy / dist,
                    speed: stats.speed,
                    damage: stats.damage,
                    radius: stats.projSize || 5,
                    pierce: stats.pierce || 0,
                    homing: stats.homingStrength,
                    lifetime: 3,
                    color: '#3b82f6',
                    isPlayerOwned: true
                });
            }

            if (audio && count > 0) audio.laser();
        }
    }

    _updateNova(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;

            // Synergy: Void Collapse — pull enemies in first
            if (player.synergies.voidNova) {
                const pulled = spatialHash.queryRadius(player.x, player.y, stats.radius * 1.5);
                for (const enemy of pulled) {
                    if (!enemy.alive) continue;
                    applyKnockback(enemy, enemy.x + (enemy.x - player.x), enemy.y + (enemy.y - player.y), 200);
                }
            }

            const nearby = spatialHash.queryRadius(player.x, player.y, stats.radius);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                applyKnockback(enemy, player.x, player.y, stats.knockback || 150);
            }

            // Visual: expanding ring
            weapon.state.ringTimer = 0.3;
            weapon.state.ringRadius = stats.radius;

            if (audio) audio.explosion();
            if (particles) {
                particles.emit({
                    x: player.x, y: player.y, count: 20,
                    color: ['#f59e0b', '#fbbf24', '#fff'],
                    speed: 150, speedVar: 80,
                    size: 4, sizeEnd: 0,
                    life: 0.3, lifeVar: 0.1,
                    alpha: 0.8, alphaEnd: 0
                });
            }
        }

        // Animate ring
        if (weapon.state.ringTimer > 0) {
            weapon.state.ringTimer -= dt;
        }
    }

    _updateLightning(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;

            // Find nearest enemy to start the chain
            let current = null;
            let nearestDist = Infinity;
            enemies.forEachForward((e) => {
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    current = e;
                }
            });

            if (!current) return;

            const hitSet = new Set();
            const chainPoints = [{ x: player.x, y: player.y }];

            for (let i = 0; i < stats.chains && current; i++) {
                hitSet.add(current);
                chainPoints.push({ x: current.x, y: current.y });

                const result = applyDamageToEnemy(current, stats.damage, player, particles, audio, FX);
                applyStun(current, stats.stunDuration || 0.2);

                // Synergy: frozen lightning
                if (player.synergies.frozenLightning) {
                    applyFreeze(current, 0.8);
                }

                if (particles) particles.emit(FX.lightning(current.x, current.y));

                // Find next target
                const candidates = spatialHash.queryRadius(current.x, current.y, stats.chainRange);
                let next = null;
                let nextDist = Infinity;
                for (const c of candidates) {
                    if (hitSet.has(c) || !c.alive) continue;
                    const dx = c.x - current.x;
                    const dy = c.y - current.y;
                    const d = dx * dx + dy * dy;
                    if (d < nextDist) {
                        nextDist = d;
                        next = c;
                    }
                }
                current = next;
            }

            weapon.state.chainPoints = chainPoints;
            weapon.state.chainTimer = 0.15;

            if (audio) audio.lightning();
        }

        if (weapon.state.chainTimer > 0) {
            weapon.state.chainTimer -= dt;
        }
    }

    _updateFrost(dt, weapon, stats, player, enemies, spatialHash, particles, audio) {
        weapon.state.radius = stats.radius;

        const nearby = spatialHash.queryRadius(player.x, player.y, stats.radius);
        for (const enemy of nearby) {
            if (!enemy.alive) continue;

            // Tick damage
            const dmg = stats.damage * dt;
            enemy.hp -= dmg * (1 + player.damageBonus);
            player.damageDealt += dmg;

            // Slow
            applySlow(enemy, stats.slowPercent, 0.5);

            // Freeze chance
            if (stats.freezeChance > 0 && Math.random() < stats.freezeChance * dt) {
                applyFreeze(enemy, 1.0);
                if (audio) audio.freeze();
                if (particles) particles.emit(FX.frost(enemy.x, enemy.y));
            }

            if (enemy.hp <= 0 && enemy.alive) {
                enemy.hp = 0;
                // Will be cleaned up by main game loop
            }
        }
    }

    _updateBeam(dt, weapon, stats, player, enemies, spatialHash, particles, audio, renderer) {
        // Find nearest enemy
        let target = null;
        let nearestDist = Infinity;
        enemies.forEachForward((e) => {
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const d = dx * dx + dy * dy;
            if (d < nearestDist && d < stats.range * stats.range) {
                nearestDist = d;
                target = e;
            }
        });

        weapon.state.active = !!target;
        if (!target) return;

        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        weapon.state.beamEndX = player.x + nx * stats.range;
        weapon.state.beamEndY = player.y + ny * stats.range;

        // Hit all enemies along the beam line
        // Use spatial hash to find candidates, then check distance to line
        const halfWidth = stats.width / 2;
        const candidates = spatialHash.query(
            Math.min(player.x, weapon.state.beamEndX) - halfWidth,
            Math.min(player.y, weapon.state.beamEndY) - halfWidth,
            Math.max(player.x, weapon.state.beamEndX) + halfWidth,
            Math.max(player.y, weapon.state.beamEndY) + halfWidth
        );

        const dps = stats.dps * (1 + player.damageBonus);

        // Synergy: split beam
        const splitTargets = player.synergies.guidedBeam ? 3 : 1;
        let beamTargets = [target];

        if (splitTargets > 1) {
            const extras = [];
            enemies.forEachForward((e) => {
                if (e === target) return;
                const d = Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2);
                if (d < stats.range) extras.push({ enemy: e, dist: d });
            });
            extras.sort((a, b) => a.dist - b.dist);
            for (let i = 0; i < splitTargets - 1 && i < extras.length; i++) {
                beamTargets.push(extras[i].enemy);
            }
        }

        for (const candidate of candidates) {
            if (!candidate.alive) continue;
            // Point-to-line distance check
            const ex = candidate.x - player.x;
            const ey = candidate.y - player.y;
            const proj = ex * nx + ey * ny;
            if (proj < 0 || proj > stats.range) continue;
            const perpX = ex - proj * nx;
            const perpY = ey - proj * ny;
            const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
            if (perpDist < halfWidth + candidate.radius) {
                candidate.hp -= dps * dt;
                candidate.flashTimer = 0.05;
                player.damageDealt += dps * dt;
            }
        }

        weapon.state.beamTargets = beamTargets.map(t => ({ x: t.x, y: t.y }));
    }

    render(ctx, renderer, player) {
        for (const [id, weapon] of this.weapons) {
            const stats = getWeaponStats(id, weapon.level);

            switch (id) {
                case 'orbital':
                    if (weapon.state.orbPositions) {
                        for (const orb of weapon.state.orbPositions) {
                            renderer.drawGlowCircle(orb.x, orb.y, orb.size, '#a855f7', 12);
                            renderer.fillCircle(orb.x, orb.y, orb.size * 0.5, 'rgba(168,85,247,0.4)');
                        }
                    }
                    break;

                case 'nova':
                    if (weapon.state.ringTimer > 0) {
                        const t = 1 - weapon.state.ringTimer / 0.3;
                        const r = weapon.state.ringRadius * t;
                        const alpha = 1 - t;
                        ctx.strokeStyle = `rgba(245,158,11,${alpha})`;
                        ctx.lineWidth = 3 * (1 - t);
                        ctx.shadowColor = '#f59e0b';
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                    break;

                case 'lightning':
                    if (weapon.state.chainTimer > 0 && weapon.state.chainPoints) {
                        const alpha = weapon.state.chainTimer / 0.15;
                        ctx.strokeStyle = `rgba(251,191,36,${alpha})`;
                        ctx.lineWidth = 2;
                        ctx.shadowColor = '#fbbf24';
                        ctx.shadowBlur = 12;
                        ctx.beginPath();
                        const pts = weapon.state.chainPoints;
                        ctx.moveTo(pts[0].x, pts[0].y);
                        for (let i = 1; i < pts.length; i++) {
                            // Jagged line for lightning effect
                            const midX = (pts[i - 1].x + pts[i].x) / 2 + (Math.random() - 0.5) * 15;
                            const midY = (pts[i - 1].y + pts[i].y) / 2 + (Math.random() - 0.5) * 15;
                            ctx.lineTo(midX, midY);
                            ctx.lineTo(pts[i].x, pts[i].y);
                        }
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                    break;

                case 'frost':
                    if (weapon.state.radius) {
                        ctx.fillStyle = 'rgba(34,211,238,0.05)';
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, weapon.state.radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(34,211,238,0.15)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                    break;

                case 'beam':
                    if (weapon.state.active) {
                        const targets = weapon.state.beamTargets || [{ x: weapon.state.beamEndX, y: weapon.state.beamEndY }];
                        for (const t of targets) {
                            renderer.drawGlowLine(
                                player.x, player.y, t.x, t.y,
                                '#ef4444', stats.width || 4, 15
                            );
                            // Core white line
                            renderer.drawLine(player.x, player.y, t.x, t.y, 'rgba(255,255,255,0.6)', 1);
                        }
                    }
                    break;
            }
        }
    }

    reset() {
        this.weapons.clear();
    }

    getWeaponIds() {
        return Array.from(this.weapons.keys());
    }

    getWeaponInfo() {
        const info = [];
        for (const [id, w] of this.weapons) {
            const def = WEAPON_DEFS[id];
            info.push({ id, name: def.name, level: w.level, maxLevel: def.maxLevel, color: def.color });
        }
        return info;
    }
}
