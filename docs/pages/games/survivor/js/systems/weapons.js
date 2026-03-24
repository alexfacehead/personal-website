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

    upgradeWeapon(id, force = false) {
        const w = this.weapons.get(id);
        if (!w) return false;
        const def = WEAPON_DEFS[id];
        if (!force && w.level >= def.maxLevel) return false;
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
                case 'gravity':
                    this._updateGravity(dt, weapon, stats, player, enemies, spatialHash, particles, audio);
                    break;
                case 'phantomBlade':
                    this._updatePhantomBlade(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'voidRift':
                    this._updateVoidRift(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'pulseWard':
                    this._updatePulseWard(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio, projectilePool);
                    break;
                case 'shadowSwarm':
                    this._updateShadowSwarm(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'voidRain':
                    this._updateVoidRain(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'temporalEcho':
                    this._updateTemporalEcho(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'singularityCannon':
                    this._updateSingularityCannon(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'ricochetShard':
                    this._updateRicochetShard(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'hexRing':
                    this._updateHexRing(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'antimatterLance':
                    this._updateAntimatterLance(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'chainScythe':
                    this._updateChainScythe(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'plasmaMortar':
                    this._updatePlasmaMortar(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
                case 'chronoTrap':
                    this._updateChronoTrap(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio);
                    break;
            }
        }
    }

    _updateOrbital(dt, weapon, stats, player, enemies, spatialHash, particles, audio) {
        if (!weapon.state.angle) weapon.state.angle = 0;
        const speedMult = player.synergies.sentinelGrid ? 1.5 : 1.0;
        weapon.state.angle += stats.speed * speedMult * dt;

        const count = stats.count;
        for (let i = 0; i < count; i++) {
            const angle = weapon.state.angle + (Math.PI * 2 * i) / count;
            const orbX = player.x + Math.cos(angle) * stats.radius;
            const orbY = player.y + Math.sin(angle) * stats.radius;

            // Check collision with enemies (expanded range for sentinel grid)
            const hitRadius = player.synergies.sentinelGrid ? stats.orbSize + 18 : stats.orbSize + 10;
            const nearby = spatialHash.queryRadius(orbX, orbY, hitRadius);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                const dx = enemy.x - orbX;
                const dy = enemy.y - orbY;
                if (dx * dx + dy * dy < (hitRadius + enemy.radius) * (hitRadius + enemy.radius)) {
                    const dmgMult = player.synergies.sentinelGrid ? 1.3 : 1.0;
                    const result = applyDamageToEnemy(enemy, stats.damage * dmgMult, player, particles, audio, FX);
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

            const novaDmg = player.synergies.bladeStorm ? stats.damage * 1.5 : stats.damage;
            const nearby = spatialHash.queryRadius(player.x, player.y, stats.radius);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                applyDamageToEnemy(enemy, novaDmg, player, particles, audio, FX);
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

    _updatePhantomBlade(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (!weapon.state.slashAngle) weapon.state.slashAngle = 0;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;

            // Alternate slash direction
            weapon.state.slashDir = (weapon.state.slashDir || 1) * -1;

            // Find nearest enemy to aim the slash toward
            let targetAngle = weapon.state.slashAngle;
            let nearestDist = Infinity;
            enemies.forEachForward((e) => {
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    targetAngle = Math.atan2(dy, dx);
                }
            });

            weapon.state.slashAngle = targetAngle;
            const halfArc = stats.arcAngle / 2;

            // Hit all enemies in the arc
            const nearby = spatialHash.queryRadius(player.x, player.y, stats.range);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                let angle = Math.atan2(dy, dx) - targetAngle;
                // Normalize to -PI..PI
                while (angle > Math.PI) angle -= Math.PI * 2;
                while (angle < -Math.PI) angle += Math.PI * 2;

                if (Math.abs(angle) <= halfArc) {
                    applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    applyKnockback(enemy, player.x, player.y, stats.knockback || 120);
                }
            }

            // Visual slash
            weapon.state.slashTimer = 0.2;

            if (audio) audio.laser();
            if (particles) {
                for (let i = 0; i < 8; i++) {
                    const a = targetAngle - halfArc + (stats.arcAngle * i) / 7;
                    particles.emit({
                        x: player.x + Math.cos(a) * stats.range * 0.5,
                        y: player.y + Math.sin(a) * stats.range * 0.5,
                        count: 2,
                        color: ['#c084fc', '#e9d5ff', '#fff'],
                        speed: 50, speedVar: 30,
                        size: 3, sizeEnd: 0,
                        life: 0.2, lifeVar: 0.05,
                        alpha: 0.9, alphaEnd: 0
                    });
                }
            }
        }

        if (weapon.state.slashTimer > 0) {
            weapon.state.slashTimer -= dt;
        }
    }

    _updateVoidRift(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.rifts) weapon.state.rifts = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 1;

            // Find enemy clusters to place rifts
            const clusterCenters = [];
            enemies.forEachForward((e) => {
                if (!e.alive) return;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 400) {
                    // Count nearby enemies as cluster score
                    const nearby = spatialHash.queryRadius(e.x, e.y, stats.radius);
                    clusterCenters.push({ x: e.x, y: e.y, score: nearby.length, dist });
                }
            });

            // Sort by cluster density
            clusterCenters.sort((a, b) => b.score - a.score);

            for (let i = 0; i < count && i < clusterCenters.length; i++) {
                const c = clusterCenters[i];
                weapon.state.rifts.push({
                    x: c.x, y: c.y,
                    life: stats.duration,
                    maxLife: stats.duration,
                    radius: stats.radius
                });
            }

            if (audio && clusterCenters.length > 0) audio.explosion();
            if (particles && clusterCenters.length > 0) {
                const c = clusterCenters[0];
                particles.emit({
                    x: c.x, y: c.y, count: 12,
                    color: ['#e879f9', '#f0abfc', '#fdf4ff'],
                    speed: 80, speedVar: 40,
                    size: 4, sizeEnd: 0,
                    life: 0.4, lifeVar: 0.1,
                    alpha: 0.9, alphaEnd: 0
                });
            }
        }

        // Update active rifts
        for (let i = weapon.state.rifts.length - 1; i >= 0; i--) {
            const rift = weapon.state.rifts[i];
            rift.life -= dt;
            if (rift.life <= 0) {
                weapon.state.rifts.splice(i, 1);
                continue;
            }

            const nearby = spatialHash.queryRadius(rift.x, rift.y, rift.radius);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                const dmg = stats.damage * dt * (1 + player.damageBonus);
                enemy.hp -= dmg;
                enemy.flashTimer = 0.05;
                player.damageDealt += dmg;
                if (enemy.hp <= 0 && enemy.alive) {
                    enemy.hp = 0;
                }
            }
        }
    }

    _updatePulseWard(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio, projectilePool) {
        if (!weapon.state.wards) weapon.state.wards = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 1;
            for (let i = 0; i < count; i++) {
                const angle = count > 1 ? (Math.PI * 2 * i) / count : 0;
                const offset = count > 1 ? 50 : 0;
                weapon.state.wards.push({
                    x: player.x + Math.cos(angle) * offset,
                    y: player.y + Math.sin(angle) * offset,
                    life: stats.duration,
                    maxLife: stats.duration,
                    zapTimer: 0
                });
            }
            if (audio) audio.pickup();
        }

        // Update wards
        for (let i = weapon.state.wards.length - 1; i >= 0; i--) {
            const ward = weapon.state.wards[i];
            ward.life -= dt;
            if (ward.life <= 0) {
                weapon.state.wards.splice(i, 1);
                continue;
            }

            // Zap nearby enemies
            ward.zapTimer -= dt;
            if (ward.zapTimer <= 0) {
                ward.zapTimer = stats.zapCooldown || 1.0;
                const nearby = spatialHash.queryRadius(ward.x, ward.y, stats.zapRadius);
                let zapped = false;
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    zapped = true;
                    break; // One target per zap
                }
                if (zapped) {
                    ward.zapFlash = 0.1;
                    if (audio) audio.lightning();
                }
            }

            if (ward.zapFlash > 0) ward.zapFlash -= dt;

            // Deflect enemy projectiles
            if (projectilePool) {
                const deflectR = stats.deflectRadius || 60;
                projectilePool.forEach((proj) => {
                    if (proj.isPlayerOwned) return;
                    const dx = proj.x - ward.x;
                    const dy = proj.y - ward.y;
                    if (dx * dx + dy * dy < deflectR * deflectR) {
                        projectilePool.release(proj);
                        if (particles) {
                            particles.emit({
                                x: proj.x, y: proj.y, count: 4,
                                color: ['#34d399', '#fff'],
                                speed: 60, speedVar: 30,
                                size: 2, sizeEnd: 0,
                                life: 0.2, lifeVar: 0.05,
                                alpha: 0.8, alphaEnd: 0
                            });
                        }
                    }
                });
            }
        }
    }

    _updateShadowSwarm(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.drones) weapon.state.drones = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 2;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                weapon.state.drones.push({
                    x: player.x + Math.cos(angle) * 20,
                    y: player.y + Math.sin(angle) * 20,
                    life: stats.droneLife,
                    targetId: null,
                    hitCooldown: 0
                });
            }
            if (particles) {
                particles.emit({
                    x: player.x, y: player.y, count: 6,
                    color: ['#94a3b8', '#cbd5e1', '#fff'],
                    speed: 80, speedVar: 40,
                    size: 2, sizeEnd: 0,
                    life: 0.3, lifeVar: 0.1,
                    alpha: 0.7, alphaEnd: 0
                });
            }
        }

        // Cap max drones to prevent lag
        const MAX_DRONES = 15;
        while (weapon.state.drones.length > MAX_DRONES) {
            weapon.state.drones.shift();
        }

        // Update drones — use spatial hash for perf
        const droneSpeed = stats.droneSpeed || 220;
        const SEARCH_RADIUS = 300;
        for (let i = weapon.state.drones.length - 1; i >= 0; i--) {
            const drone = weapon.state.drones[i];
            drone.life -= dt;
            if (drone.life <= 0) {
                weapon.state.drones.splice(i, 1);
                continue;
            }

            if (drone.hitCooldown > 0) drone.hitCooldown -= dt;

            // Find nearest enemy via spatial hash (much faster)
            const nearby = spatialHash.queryRadius(drone.x, drone.y, SEARCH_RADIUS);
            let target = null;
            let nearestDist = Infinity;
            for (const e of nearby) {
                if (!e.alive) continue;
                const dx = e.x - drone.x;
                const dy = e.y - drone.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    target = e;
                }
            }

            if (target) {
                const dx = target.x - drone.x;
                const dy = target.y - drone.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                drone.x += (dx / dist) * droneSpeed * dt;
                drone.y += (dy / dist) * droneSpeed * dt;

                // Hit enemy
                if (dist < target.radius + 6 && drone.hitCooldown <= 0) {
                    const droneDmg = player.synergies.phantomArmy ? stats.damage * 1.8 : stats.damage;
                    applyDamageToEnemy(target, droneDmg, player, particles, audio, FX);
                    drone.hitCooldown = 0.3;
                }
            }
        }
    }

    _updateVoidRain(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.zones) weapon.state.zones = [];
        if (!weapon.state.pools) weapon.state.pools = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 2;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 60 + Math.random() * 180;
                weapon.state.zones.push({
                    x: player.x + Math.cos(angle) * dist,
                    y: player.y + Math.sin(angle) * dist,
                    life: stats.duration,
                    maxLife: stats.duration,
                    hitTimer: 0
                });
            }
        }

        // Update impact zones
        for (let i = weapon.state.zones.length - 1; i >= 0; i--) {
            const zone = weapon.state.zones[i];
            zone.life -= dt;
            zone.hitTimer -= dt;
            if (zone.hitTimer <= 0) {
                zone.hitTimer = 0.3;
                const nearby = spatialHash.queryRadius(zone.x, zone.y, stats.radius);
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyDamageToEnemy(enemy, stats.damage * 0.5, player, particles, audio, FX);
                }
            }
            if (zone.life <= 0) {
                // Leave acid pool
                weapon.state.pools.push({
                    x: zone.x, y: zone.y,
                    life: stats.poolDuration,
                    maxLife: stats.poolDuration,
                    hitTimer: 0
                });
                weapon.state.zones.splice(i, 1);
            }
        }

        // Update acid pools
        for (let i = weapon.state.pools.length - 1; i >= 0; i--) {
            const pool = weapon.state.pools[i];
            pool.life -= dt;
            pool.hitTimer -= dt;
            if (pool.hitTimer <= 0) {
                pool.hitTimer = 0.5;
                const nearby = spatialHash.queryRadius(pool.x, pool.y, stats.radius * 0.8);
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyDamageToEnemy(enemy, stats.damage * 0.3, player, particles, audio, FX);
                    applySlow(enemy, stats.poolSlow, 0.5);
                    // Acid Storm synergy: lightning strikes in pools
                    if (player.synergies.acidStorm) {
                        applyDamageToEnemy(enemy, stats.damage * 0.8, player, particles, audio, FX);
                        applyStun(enemy, 0.15);
                    }
                }
            }
            if (pool.life <= 0) {
                weapon.state.pools.splice(i, 1);
            }
        }
    }

    _updateTemporalEcho(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.trail) weapon.state.trail = [];
        if (!weapon.state.echoPos) weapon.state.echoPos = { x: player.x, y: player.y };
        weapon.state.trailTimer = (weapon.state.trailTimer || 0) + dt;

        // Record player position every 50ms
        if (weapon.state.trailTimer >= 0.05) {
            weapon.state.trailTimer = 0;
            weapon.state.trail.push({ x: player.x, y: player.y, t: 0 });
        }

        // Age trail entries
        for (let i = weapon.state.trail.length - 1; i >= 0; i--) {
            weapon.state.trail[i].t += dt;
            if (weapon.state.trail[i].t > stats.delay + 2) {
                weapon.state.trail.splice(i, 1);
            }
        }

        // Find echo position (delayed)
        let echoFound = false;
        for (const entry of weapon.state.trail) {
            if (entry.t >= stats.delay) {
                weapon.state.echoPos.x = entry.x;
                weapon.state.echoPos.y = entry.y;
                echoFound = true;
                break;
            }
        }

        // Deal damage at echo position
        if (echoFound) {
            weapon.timer += dt;
            if (weapon.timer >= stats.tickRate) {
                weapon.timer -= stats.tickRate;
                const echoDmg = player.synergies.phantomArmy ? stats.damage * 1.5 : stats.damage;
                const nearby = spatialHash.queryRadius(weapon.state.echoPos.x, weapon.state.echoPos.y, stats.echoDamageRadius);
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyDamageToEnemy(enemy, echoDmg, player, particles, audio, FX);
                }
            }
        }

        // Phantom Army synergy: 2 extra echoes at staggered delays
        if (player.synergies.phantomArmy && !weapon.state.extraEchos) {
            weapon.state.extraEchos = [
                { pos: { x: player.x, y: player.y }, delay: stats.delay * 1.5 },
                { pos: { x: player.x, y: player.y }, delay: stats.delay * 2.0 }
            ];
        }
        if (weapon.state.extraEchos) {
            for (const extra of weapon.state.extraEchos) {
                for (const entry of weapon.state.trail) {
                    if (entry.t >= extra.delay) {
                        extra.pos.x = entry.x;
                        extra.pos.y = entry.y;
                        break;
                    }
                }
                // Extra echoes deal damage too
                weapon.state.extraTimer = (weapon.state.extraTimer || 0) + dt;
                if (weapon.state.extraTimer >= stats.tickRate) {
                    weapon.state.extraTimer -= stats.tickRate;
                    const nearby = spatialHash.queryRadius(extra.pos.x, extra.pos.y, stats.echoDamageRadius * 0.8);
                    for (const enemy of nearby) {
                        if (!enemy.alive) continue;
                        applyDamageToEnemy(enemy, stats.damage * 0.7, player, particles, audio, FX);
                    }
                }
            }
        }
    }

    _updateSingularityCannon(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.orbs) weapon.state.orbs = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            // Fire toward nearest enemy
            let targetAngle = Math.random() * Math.PI * 2;
            let nearestDist = Infinity;
            const nearby = spatialHash.queryRadius(player.x, player.y, 400);
            for (const e of nearby) {
                if (!e.alive) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    targetAngle = Math.atan2(dy, dx);
                }
            }
            weapon.state.orbs.push({
                x: player.x, y: player.y,
                vx: Math.cos(targetAngle) * stats.speed,
                vy: Math.sin(targetAngle) * stats.speed,
                radius: stats.baseRadius,
                life: stats.duration,
                kills: 0,
                hitTimer: 0
            });
            if (audio) audio.pickup();
        }

        // Update orbs
        for (let i = weapon.state.orbs.length - 1; i >= 0; i--) {
            const orb = weapon.state.orbs[i];
            orb.life -= dt;
            if (orb.life <= 0) {
                weapon.state.orbs.splice(i, 1);
                continue;
            }

            orb.x += orb.vx * dt;
            orb.y += orb.vy * dt;
            orb.hitTimer -= dt;

            // Pull nearby enemies
            const pullMult = player.synergies.eventHorizon ? 2.0 : 1.0;
            const pullRange = orb.radius * 3;
            const pullNearby = spatialHash.queryRadius(orb.x, orb.y, pullRange);
            for (const enemy of pullNearby) {
                if (!enemy.alive) continue;
                const dx = orb.x - enemy.x;
                const dy = orb.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const pull = (stats.pullStrength * pullMult) / dist;
                enemy.x += (dx / dist) * pull * dt;
                enemy.y += (dy / dist) * pull * dt;
            }

            // Damage + absorb enemies touching the orb
            if (orb.hitTimer <= 0) {
                orb.hitTimer = 0.2;
                const touching = spatialHash.queryRadius(orb.x, orb.y, orb.radius);
                for (const enemy of touching) {
                    if (!enemy.alive) continue;
                    const result = applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    if (!enemy.alive) {
                        orb.kills++;
                        orb.radius = Math.min(stats.maxRadius, stats.baseRadius + orb.kills * stats.growthPerKill);
                    }
                }
            }
        }
    }

    _updateRicochetShard(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.shards) weapon.state.shards = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 1;
            for (let i = 0; i < count; i++) {
                // Find nearest enemy to aim at
                let targetAngle = Math.random() * Math.PI * 2;
                const nearby = spatialHash.queryRadius(player.x, player.y, 350);
                let nearestDist = Infinity;
                for (const e of nearby) {
                    if (!e.alive) continue;
                    const dx = e.x - player.x;
                    const dy = e.y - player.y;
                    const d = dx * dx + dy * dy;
                    if (d < nearestDist) {
                        nearestDist = d;
                        targetAngle = Math.atan2(dy, dx);
                    }
                }
                // Spread multiple shards
                const spread = count > 1 ? (i - (count - 1) / 2) * 0.2 : 0;
                weapon.state.shards.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(targetAngle + spread) * stats.speed,
                    vy: Math.sin(targetAngle + spread) * stats.speed,
                    bouncesLeft: stats.bounces,
                    hitEnemies: new Set(),
                    life: 3.0
                });
            }
            if (audio) audio.pickup();
        }

        // Update shards
        const MAX_SHARDS = 20;
        while (weapon.state.shards.length > MAX_SHARDS) weapon.state.shards.shift();

        for (let i = weapon.state.shards.length - 1; i >= 0; i--) {
            const shard = weapon.state.shards[i];
            shard.life -= dt;
            if (shard.life <= 0 || shard.bouncesLeft < 0) {
                weapon.state.shards.splice(i, 1);
                continue;
            }

            shard.x += shard.vx * dt;
            shard.y += shard.vy * dt;

            // Hit detection
            const nearby = spatialHash.queryRadius(shard.x, shard.y, 20);
            for (const enemy of nearby) {
                if (!enemy.alive || shard.hitEnemies.has(enemy)) continue;
                const dx = enemy.x - shard.x;
                const dy = enemy.y - shard.y;
                if (dx * dx + dy * dy < (enemy.radius + 6) * (enemy.radius + 6)) {
                    shard.hitEnemies.add(enemy);
                    applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);

                    // Bounce to next nearest enemy
                    shard.bouncesLeft--;
                    if (shard.bouncesLeft >= 0) {
                        const bounceTargets = spatialHash.queryRadius(shard.x, shard.y, stats.bounceRange);
                        let nextTarget = null;
                        let nextDist = Infinity;
                        for (const t of bounceTargets) {
                            if (!t.alive || shard.hitEnemies.has(t)) continue;
                            const tdx = t.x - shard.x;
                            const tdy = t.y - shard.y;
                            const td = tdx * tdx + tdy * tdy;
                            if (td < nextDist) {
                                nextDist = td;
                                nextTarget = t;
                            }
                        }
                        if (nextTarget) {
                            const angle = Math.atan2(nextTarget.y - shard.y, nextTarget.x - shard.x);
                            shard.vx = Math.cos(angle) * stats.speed;
                            shard.vy = Math.sin(angle) * stats.speed;
                        }
                    }
                    break;
                }
            }
        }
    }

    _updateHexRing(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.phase) weapon.state.phase = 0;
        weapon.state.phase += dt * stats.pulseSpeed;
        weapon.state.tickTimer = (weapon.state.tickTimer || 0) - dt;

        // Pulsing radius
        const t = (Math.sin(weapon.state.phase) + 1) / 2;
        const currentRadius = stats.minRadius + t * (stats.maxRadius - stats.minRadius);
        weapon.state.currentRadius = currentRadius;

        // Damage + debuff enemies inside
        if (weapon.state.tickTimer <= 0) {
            weapon.state.tickTimer = stats.tickRate;
            const nearby = spatialHash.queryRadius(player.x, player.y, currentRadius);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                if (dx * dx + dy * dy < currentRadius * currentRadius) {
                    applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    applySlow(enemy, stats.slowAmount, 0.5);
                    // Damage amplification — mark enemy
                    enemy._hexed = stats.damageAmp;
                    enemy._hexTimer = 0.5;
                }
            }
        }
    }

    _updateAntimatterLance(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.beams) weapon.state.beams = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        // Charging phase
        if (!weapon.state.charging && weapon.timer >= cooldown) {
            weapon.state.charging = true;
            weapon.state.chargeProgress = 0;
            // Find aim direction
            let targetAngle = Math.random() * Math.PI * 2;
            const nearby = spatialHash.queryRadius(player.x, player.y, 500);
            let nearestDist = Infinity;
            for (const e of nearby) {
                if (!e.alive) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    targetAngle = Math.atan2(dy, dx);
                }
            }
            weapon.state.aimAngle = targetAngle;
        }

        if (weapon.state.charging) {
            weapon.state.chargeProgress += dt;
            if (weapon.state.chargeProgress >= stats.chargeTime) {
                // FIRE
                weapon.state.charging = false;
                weapon.timer = 0;
                const angle = weapon.state.aimAngle;
                weapon.state.beams.push({
                    x: player.x, y: player.y,
                    angle,
                    life: stats.beamDuration,
                    maxLife: stats.beamDuration
                });

                // Deal damage along beam line
                const steps = Math.floor(stats.beamLength / 30);
                const hitSet = new Set();
                for (let s = 0; s < steps; s++) {
                    const bx = player.x + Math.cos(angle) * s * 30;
                    const by = player.y + Math.sin(angle) * s * 30;
                    const nearby = spatialHash.queryRadius(bx, by, stats.beamWidth);
                    for (const enemy of nearby) {
                        if (!enemy.alive || hitSet.has(enemy)) continue;
                        hitSet.add(enemy);
                        applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                        applyKnockback(enemy, bx, by, 100);
                    }
                }

                if (audio) audio.lightning();
                if (particles) {
                    particles.emit({
                        x: player.x + Math.cos(angle) * 40,
                        y: player.y + Math.sin(angle) * 40,
                        count: 8,
                        color: ['#facc15', '#fef08a', '#fff'],
                        speed: 100, speedVar: 50,
                        size: 3, sizeEnd: 0,
                        life: 0.3, lifeVar: 0.1,
                        alpha: 0.9, alphaEnd: 0
                    });
                }
            }
        }

        // Update active beams (visual only)
        for (let i = weapon.state.beams.length - 1; i >= 0; i--) {
            weapon.state.beams[i].life -= dt;
            if (weapon.state.beams[i].life <= 0) {
                weapon.state.beams.splice(i, 1);
            }
        }
    }

    _updateChainScythe(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;
        if (weapon.state.slashTimer > 0) weapon.state.slashTimer -= dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;

            // Find nearest enemy for aim direction
            let aimAngle = weapon.state.lastAim || 0;
            const nearby = spatialHash.queryRadius(player.x, player.y, stats.range + 50);
            let nearestDist = Infinity;
            for (const e of nearby) {
                if (!e.alive) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    aimAngle = Math.atan2(dy, dx);
                }
            }
            weapon.state.lastAim = aimAngle;
            weapon.state.slashTimer = 0.15;
            weapon.state.slashAngle = aimAngle;

            // Hit enemies in arc
            const halfArc = stats.arcAngle / 2;
            const inArc = spatialHash.queryRadius(player.x, player.y, stats.range);
            const hitInArc = [];
            for (const enemy of inArc) {
                if (!enemy.alive) continue;
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const angle = Math.atan2(dy, dx);
                let diff = angle - aimAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) < halfArc) {
                    applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    applyKnockback(enemy, player.x, player.y, 80);
                    hitInArc.push(enemy);
                }
            }

            // Chain to additional enemies
            if (hitInArc.length > 0 && stats.chains > 0) {
                let lastHit = hitInArc[hitInArc.length - 1];
                const chainHit = new Set(hitInArc);
                let chainDmg = stats.damage;
                for (let c = 0; c < stats.chains; c++) {
                    chainDmg *= stats.chainDecay;
                    const chainNearby = spatialHash.queryRadius(lastHit.x, lastHit.y, stats.chainRange);
                    let nextTarget = null;
                    let nextDist = Infinity;
                    for (const t of chainNearby) {
                        if (!t.alive || chainHit.has(t)) continue;
                        const dx = t.x - lastHit.x;
                        const dy = t.y - lastHit.y;
                        const d = dx * dx + dy * dy;
                        if (d < nextDist) { nextDist = d; nextTarget = t; }
                    }
                    if (!nextTarget) break;
                    chainHit.add(nextTarget);
                    applyDamageToEnemy(nextTarget, chainDmg, player, particles, audio, FX);
                    lastHit = nextTarget;
                }
            }
        }
    }

    _updatePlasmaMortar(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.shells) weapon.state.shells = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 1;
            for (let i = 0; i < count; i++) {
                // Target a random cluster of enemies or random position
                let tx = player.x + (Math.random() - 0.5) * 300;
                let ty = player.y + (Math.random() - 0.5) * 300;
                const nearby = spatialHash.queryRadius(player.x, player.y, 350);
                if (nearby.length > 0) {
                    const target = nearby[Math.floor(Math.random() * nearby.length)];
                    if (target.alive) { tx = target.x; ty = target.y; }
                }
                const dx = tx - player.x;
                const dy = ty - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 100;
                const flightTime = dist / stats.lobSpeed;
                weapon.state.shells.push({
                    startX: player.x, startY: player.y,
                    targetX: tx, targetY: ty,
                    time: 0, flightTime,
                    arcHeight: dist * stats.lobArc * 0.3
                });
            }
            if (audio) audio.pickup();
        }

        // Update shells
        for (let i = weapon.state.shells.length - 1; i >= 0; i--) {
            const shell = weapon.state.shells[i];
            shell.time += dt;
            const t = shell.time / shell.flightTime;

            if (t >= 1.0) {
                // IMPACT
                weapon.state.shells.splice(i, 1);
                const nearby = spatialHash.queryRadius(shell.targetX, shell.targetY, stats.blastRadius);
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyDamageToEnemy(enemy, stats.damage, player, particles, audio, FX);
                    applyKnockback(enemy, shell.targetX, shell.targetY, 150);
                }
                if (particles) {
                    particles.emit(FX.explosion(shell.targetX, shell.targetY));
                }
            } else {
                // Interpolate position with arc
                shell.currentX = shell.startX + (shell.targetX - shell.startX) * t;
                shell.currentY = shell.startY + (shell.targetY - shell.startY) * t - Math.sin(t * Math.PI) * shell.arcHeight;
            }
        }
    }

    _updateChronoTrap(dt, weapon, stats, player, enemies, spatialHash, cdr, particles, audio) {
        if (!weapon.state.traps) weapon.state.traps = [];
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 1;
            for (let i = 0; i < count; i++) {
                // Place near densest enemy cluster
                let bestX = player.x + (Math.random() - 0.5) * 200;
                let bestY = player.y + (Math.random() - 0.5) * 200;
                const scan = spatialHash.queryRadius(player.x, player.y, 300);
                if (scan.length > 0) {
                    const target = scan[Math.floor(Math.random() * scan.length)];
                    if (target.alive) { bestX = target.x; bestY = target.y; }
                }
                weapon.state.traps.push({
                    x: bestX, y: bestY,
                    life: stats.duration,
                    maxLife: stats.duration,
                    tickTimer: 0,
                    tickCount: 0
                });
            }
        }

        for (let i = weapon.state.traps.length - 1; i >= 0; i--) {
            const trap = weapon.state.traps[i];
            trap.life -= dt;
            if (trap.life <= 0) {
                weapon.state.traps.splice(i, 1);
                continue;
            }

            trap.tickTimer -= dt;
            if (trap.tickTimer <= 0) {
                trap.tickTimer = 0.5;
                trap.tickCount++;
                const escalatedDmg = stats.damage * Math.pow(stats.damageEscalation, Math.min(trap.tickCount, 8));
                const nearby = spatialHash.queryRadius(trap.x, trap.y, stats.radius);
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyDamageToEnemy(enemy, escalatedDmg, player, particles, audio, FX);
                    applyFreeze(enemy, stats.freezeDuration);
                }
            }
        }
    }

    _updateGravity(dt, weapon, stats, player, enemies, spatialHash, particles, audio) {
        if (!weapon.state.wells) weapon.state.wells = [];
        const cdr = player.cooldownReduction || 0;
        const cooldown = stats.cooldown * (1 - cdr);
        weapon.timer += dt;

        // Spawn new wells
        if (weapon.timer >= cooldown) {
            weapon.timer -= cooldown;
            const count = stats.count || 1;
            for (let i = 0; i < count; i++) {
                // Place wells at player position, offset slightly for multiples
                const angle = count > 1 ? (Math.PI * 2 * i) / count : 0;
                const offset = count > 1 ? 40 : 0;
                weapon.state.wells.push({
                    x: player.x + Math.cos(angle) * offset,
                    y: player.y + Math.sin(angle) * offset,
                    life: stats.duration,
                    maxLife: stats.duration,
                    radius: stats.radius
                });
            }
            if (audio) audio.explosion();
            if (particles) {
                particles.emit({
                    x: player.x, y: player.y, count: 15,
                    color: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
                    speed: 60, speedVar: 30,
                    size: 3, sizeEnd: 0,
                    life: 0.5, lifeVar: 0.2,
                    alpha: 0.8, alphaEnd: 0
                });
            }
        }

        // Update active wells
        for (let i = weapon.state.wells.length - 1; i >= 0; i--) {
            const well = weapon.state.wells[i];
            well.life -= dt;
            if (well.life <= 0) {
                weapon.state.wells.splice(i, 1);
                continue;
            }

            const nearby = spatialHash.queryRadius(well.x, well.y, well.radius);
            for (const enemy of nearby) {
                if (!enemy.alive) continue;
                const dx = well.x - enemy.x;
                const dy = well.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                // Pull toward center
                const pullStrength = stats.pullForce * (1 - dist / well.radius);
                if (pullStrength > 0) {
                    enemy.x += (dx / dist) * pullStrength * dt;
                    enemy.y += (dy / dist) * pullStrength * dt;
                }

                // Damage increases closer to center (2x at center, 0.5x at edge)
                const proximityMult = 0.5 + 1.5 * (1 - dist / well.radius);
                // Synergy: frozen enemies take double damage in wells
                const frozenMult = (player.synergies.gravityFreeze && enemy.frozen) ? 2 : 1;
                const dmg = stats.damage * proximityMult * frozenMult * dt * (1 + player.damageBonus);
                enemy.hp -= dmg;
                enemy.flashTimer = 0.05;
                player.damageDealt += dmg;

                if (enemy.hp <= 0 && enemy.alive) {
                    enemy.hp = 0;
                }
            }
        }
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

                case 'pulseWard':
                    if (weapon.state.wards) {
                        for (const ward of weapon.state.wards) {
                            const t = ward.life / ward.maxLife;
                            const pulse = Math.sin(Date.now() * 0.005) * 0.1;

                            // Ward base
                            ctx.save();
                            ctx.shadowColor = '#34d399';
                            ctx.shadowBlur = ward.zapFlash > 0 ? 20 : 8;
                            renderer.drawGlowCircle(ward.x, ward.y, 6 * t, '#34d399', 10);
                            ctx.restore();

                            // Range ring
                            ctx.strokeStyle = `rgba(52,211,153,${0.12 * t + pulse * 0.05})`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.arc(ward.x, ward.y, stats.zapRadius, 0, Math.PI * 2);
                            ctx.stroke();

                            // Zap flash
                            if (ward.zapFlash > 0) {
                                ctx.fillStyle = `rgba(52,211,153,${ward.zapFlash * 2})`;
                                ctx.beginPath();
                                ctx.arc(ward.x, ward.y, stats.zapRadius * 0.3, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                    }
                    break;

                case 'shadowSwarm':
                    if (weapon.state.drones) {
                        for (const drone of weapon.state.drones) {
                            const t = Math.min(1, drone.life / 1.0);
                            const flicker = 0.7 + Math.sin(Date.now() * 0.02 + drone.x) * 0.3;
                            ctx.globalAlpha = t * flicker;
                            renderer.fillCircle(drone.x, drone.y, 4, '#94a3b8');
                            renderer.drawGlowCircle(drone.x, drone.y, 3, '#94a3b8', 6);
                            ctx.globalAlpha = 1;
                        }
                    }
                    break;

                case 'voidRain':
                    // Impact zones
                    if (weapon.state.zones) {
                        for (const zone of weapon.state.zones) {
                            const t = zone.life / zone.maxLife;
                            ctx.globalAlpha = t * 0.6;
                            ctx.fillStyle = 'rgba(74,222,128,0.3)';
                            ctx.beginPath();
                            ctx.arc(zone.x, zone.y, stats.radius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = '#4ade80';
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                            ctx.globalAlpha = 1;
                        }
                    }
                    // Acid pools
                    if (weapon.state.pools) {
                        for (const pool of weapon.state.pools) {
                            const t = pool.life / pool.maxLife;
                            ctx.globalAlpha = t * 0.35;
                            ctx.fillStyle = 'rgba(74,222,128,0.2)';
                            ctx.beginPath();
                            ctx.arc(pool.x, pool.y, stats.radius * 0.8, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }
                    }
                    break;

                case 'temporalEcho':
                    if (weapon.state.echoPos) {
                        const ep = weapon.state.echoPos;
                        const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.2;
                        ctx.globalAlpha = pulse;
                        // Ghost player
                        ctx.strokeStyle = '#818cf8';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(ep.x, ep.y, 12, 0, Math.PI * 2);
                        ctx.stroke();
                        renderer.drawGlowCircle(ep.x, ep.y, 6, '#818cf8', 12);
                        // Damage radius
                        ctx.strokeStyle = 'rgba(129,140,248,0.15)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(ep.x, ep.y, stats.echoDamageRadius, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                    break;

                case 'singularityCannon':
                    if (weapon.state.orbs) {
                        for (const orb of weapon.state.orbs) {
                            const t = orb.life / stats.duration;
                            // Pull range
                            ctx.globalAlpha = 0.06;
                            ctx.fillStyle = '#e879f9';
                            ctx.beginPath();
                            ctx.arc(orb.x, orb.y, orb.radius * 3, 0, Math.PI * 2);
                            ctx.fill();
                            // Core
                            ctx.globalAlpha = 0.8;
                            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
                            grad.addColorStop(0, '#1a0020');
                            grad.addColorStop(0.6, '#2d004d');
                            grad.addColorStop(1, 'rgba(232,121,249,0.3)');
                            ctx.fillStyle = grad;
                            ctx.beginPath();
                            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                            ctx.fill();
                            // Ring
                            ctx.strokeStyle = '#e879f9';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.globalAlpha = 1;
                        }
                    }
                    break;

                case 'ricochetShard':
                    if (weapon.state.shards) {
                        for (const shard of weapon.state.shards) {
                            ctx.fillStyle = '#f472b6';
                            ctx.save();
                            ctx.translate(shard.x, shard.y);
                            ctx.rotate(Math.atan2(shard.vy, shard.vx));
                            ctx.beginPath();
                            ctx.moveTo(8, 0);
                            ctx.lineTo(-4, -4);
                            ctx.lineTo(-2, 0);
                            ctx.lineTo(-4, 4);
                            ctx.closePath();
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                    break;

                case 'hexRing':
                    if (weapon.state.currentRadius) {
                        const r = weapon.state.currentRadius;
                        const pulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.15;
                        // Fill
                        ctx.globalAlpha = 0.04;
                        ctx.fillStyle = '#a3e635';
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
                        ctx.fill();
                        // Ring
                        ctx.globalAlpha = pulse;
                        ctx.strokeStyle = '#a3e635';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
                        ctx.stroke();
                        // Inner dashed
                        ctx.setLineDash([4, 8]);
                        ctx.globalAlpha = pulse * 0.5;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, r * 0.7, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.globalAlpha = 1;
                    }
                    break;

                case 'antimatterLance':
                    // Charge indicator
                    if (weapon.state.charging) {
                        const prog = weapon.state.chargeProgress / stats.chargeTime;
                        const angle = weapon.state.aimAngle;
                        // Aim line
                        ctx.globalAlpha = prog * 0.5;
                        ctx.strokeStyle = '#facc15';
                        ctx.lineWidth = 1 + prog * 3;
                        ctx.setLineDash([6, 6]);
                        ctx.beginPath();
                        ctx.moveTo(player.x, player.y);
                        ctx.lineTo(player.x + Math.cos(angle) * 200, player.y + Math.sin(angle) * 200);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        // Charge glow
                        renderer.drawGlowCircle(player.x, player.y, 8 * prog, '#facc15', 15 * prog);
                        ctx.globalAlpha = 1;
                    }
                    // Active beams
                    if (weapon.state.beams) {
                        for (const beam of weapon.state.beams) {
                            const t = beam.life / beam.maxLife;
                            ctx.globalAlpha = t * 0.9;
                            ctx.save();
                            ctx.translate(beam.x, beam.y);
                            ctx.rotate(beam.angle);
                            // Outer glow
                            ctx.fillStyle = `rgba(250,204,21,${t * 0.15})`;
                            ctx.fillRect(0, -stats.beamWidth * 1.5, stats.beamLength, stats.beamWidth * 3);
                            // Core beam
                            ctx.fillStyle = `rgba(254,240,138,${t * 0.8})`;
                            ctx.fillRect(0, -stats.beamWidth / 2, stats.beamLength, stats.beamWidth);
                            // Bright center
                            ctx.fillStyle = `rgba(255,255,255,${t * 0.6})`;
                            ctx.fillRect(0, -stats.beamWidth / 4, stats.beamLength, stats.beamWidth / 2);
                            ctx.restore();
                            ctx.globalAlpha = 1;
                        }
                    }
                    break;

                case 'chainScythe':
                    if (weapon.state.slashTimer > 0) {
                        const t = weapon.state.slashTimer / 0.15;
                        const halfArc = stats.arcAngle / 2;
                        const baseAngle = weapon.state.slashAngle;
                        ctx.strokeStyle = `rgba(251,146,60,${t * 0.8})`;
                        ctx.lineWidth = 4 * t;
                        ctx.shadowColor = '#fb923c';
                        ctx.shadowBlur = 12 * t;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, stats.range * (1.1 - t * 0.1), baseAngle - halfArc, baseAngle + halfArc);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                    break;

                case 'plasmaMortar':
                    if (weapon.state.shells) {
                        for (const shell of weapon.state.shells) {
                            if (shell.currentX === undefined) continue;
                            const size = 5 + Math.sin((shell.time / shell.flightTime) * Math.PI) * 4;
                            ctx.fillStyle = '#f97316';
                            ctx.beginPath();
                            ctx.arc(shell.currentX, shell.currentY, size, 0, Math.PI * 2);
                            ctx.fill();
                            renderer.drawGlowCircle(shell.currentX, shell.currentY, size * 0.7, '#f97316', 8);
                            // Shadow on ground
                            ctx.globalAlpha = 0.15;
                            ctx.fillStyle = '#f97316';
                            ctx.beginPath();
                            ctx.arc(shell.targetX, shell.targetY, stats.blastRadius * 0.4, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }
                    }
                    break;

                case 'chronoTrap':
                    if (weapon.state.traps) {
                        for (const trap of weapon.state.traps) {
                            const t = trap.life / trap.maxLife;
                            const pulse = 0.3 + Math.sin(Date.now() * 0.008) * 0.1;
                            // Outer ring
                            ctx.globalAlpha = t * pulse;
                            ctx.strokeStyle = '#22d3ee';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(trap.x, trap.y, stats.radius, 0, Math.PI * 2);
                            ctx.stroke();
                            // Fill
                            ctx.fillStyle = `rgba(34,211,238,${t * 0.06})`;
                            ctx.beginPath();
                            ctx.arc(trap.x, trap.y, stats.radius, 0, Math.PI * 2);
                            ctx.fill();
                            // Clock hands effect
                            const angle1 = (Date.now() * 0.003) % (Math.PI * 2);
                            const angle2 = (Date.now() * 0.001) % (Math.PI * 2);
                            ctx.strokeStyle = `rgba(34,211,238,${t * 0.3})`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(trap.x, trap.y);
                            ctx.lineTo(trap.x + Math.cos(angle1) * stats.radius * 0.6, trap.y + Math.sin(angle1) * stats.radius * 0.6);
                            ctx.moveTo(trap.x, trap.y);
                            ctx.lineTo(trap.x + Math.cos(angle2) * stats.radius * 0.4, trap.y + Math.sin(angle2) * stats.radius * 0.4);
                            ctx.stroke();
                            ctx.globalAlpha = 1;
                        }
                    }
                    break;

                case 'phantomBlade':
                    if (weapon.state.slashTimer > 0) {
                        const t = weapon.state.slashTimer / 0.2;
                        const halfArc = stats.arcAngle / 2;
                        const baseAngle = weapon.state.slashAngle;

                        // Slash arc
                        ctx.strokeStyle = `rgba(192,132,252,${t * 0.8})`;
                        ctx.lineWidth = 3 * t;
                        ctx.shadowColor = '#c084fc';
                        ctx.shadowBlur = 15 * t;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, stats.range * (1.1 - t * 0.1), baseAngle - halfArc, baseAngle + halfArc);
                        ctx.stroke();

                        // Inner glow arc
                        ctx.strokeStyle = `rgba(255,255,255,${t * 0.4})`;
                        ctx.lineWidth = 1.5 * t;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, stats.range * 0.6, baseAngle - halfArc * 0.8, baseAngle + halfArc * 0.8);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                    break;

                case 'voidRift':
                    if (weapon.state.rifts) {
                        for (const rift of weapon.state.rifts) {
                            const t = rift.life / rift.maxLife;
                            const pulse = Math.sin(Date.now() * 0.01) * 0.1;

                            // Outer distortion ring
                            ctx.strokeStyle = `rgba(232,121,249,${0.3 * t})`;
                            ctx.lineWidth = 2;
                            ctx.setLineDash([4, 6]);
                            ctx.beginPath();
                            ctx.arc(rift.x, rift.y, rift.radius * (1 + pulse), 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.setLineDash([]);

                            // Inner rift glow
                            ctx.fillStyle = `rgba(232,121,249,${0.06 * t})`;
                            ctx.beginPath();
                            ctx.arc(rift.x, rift.y, rift.radius * 0.8, 0, Math.PI * 2);
                            ctx.fill();

                            // Core tear
                            ctx.shadowColor = '#e879f9';
                            ctx.shadowBlur = 20 * t;
                            ctx.fillStyle = `rgba(232,121,249,${0.15 * t})`;
                            ctx.beginPath();
                            ctx.ellipse(rift.x, rift.y, rift.radius * 0.3, rift.radius * 0.15 * (1 + pulse), Date.now() * 0.002, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.shadowBlur = 0;
                        }
                    }
                    break;

                case 'gravity':
                    if (weapon.state.wells) {
                        for (const well of weapon.state.wells) {
                            const t = well.life / well.maxLife; // 1 = fresh, 0 = dying
                            const pulsePhase = Math.sin(Date.now() * 0.008) * 0.15;

                            // Outer pull ring (pulsing)
                            const outerAlpha = 0.08 + pulsePhase * 0.04;
                            ctx.fillStyle = `rgba(139,92,246,${outerAlpha * t})`;
                            ctx.beginPath();
                            ctx.arc(well.x, well.y, well.radius * (0.9 + pulsePhase * 0.1), 0, Math.PI * 2);
                            ctx.fill();

                            // Swirl rings
                            ctx.strokeStyle = `rgba(167,139,250,${0.2 * t})`;
                            ctx.lineWidth = 1.5;
                            for (let r = 0; r < 3; r++) {
                                const ringR = well.radius * (0.3 + r * 0.25);
                                const rotation = Date.now() * 0.003 * (r % 2 === 0 ? 1 : -1);
                                ctx.beginPath();
                                ctx.arc(well.x, well.y, ringR, rotation, rotation + Math.PI * 1.2);
                                ctx.stroke();
                            }

                            // Core singularity
                            ctx.shadowColor = '#8b5cf6';
                            ctx.shadowBlur = 20 * t;
                            renderer.drawGlowCircle(well.x, well.y, 8 * t, '#8b5cf6', 15);
                            renderer.fillCircle(well.x, well.y, 4 * t, '#c4b5fd');
                            ctx.shadowBlur = 0;
                        }
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

    getWeaponList() {
        const list = [];
        for (const [id, w] of this.weapons) {
            list.push({ id, level: w.level });
        }
        return list;
    }

    getAllWeaponIds() {
        return Object.keys(WEAPON_DEFS);
    }

    getWeaponDef(id) {
        return WEAPON_DEFS[id] || null;
    }
}
