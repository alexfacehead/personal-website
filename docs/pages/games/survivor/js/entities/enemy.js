// enemy.js — Enemy entity with multiple behavior types

import { ENEMY_TYPES, scaleEnemy } from '../data/enemies.js';

export function initEnemy(enemy, type, x, y, difficulty) {
    const base = ENEMY_TYPES[type];
    const scaled = scaleEnemy(base, difficulty);

    enemy.type = type;
    enemy.x = x;
    enemy.y = y;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.hp = scaled.hp;
    enemy.maxHp = scaled.hp;
    enemy.damage = scaled.damage;
    enemy.speed = scaled.speed;
    enemy.xp = scaled.xp;
    enemy.radius = base.size;
    enemy.color = base.color;
    enemy.glowColor = base.glowColor;
    enemy.sides = base.sides;
    enemy.knockbackResist = base.knockbackResist;
    enemy.behavior = base.behavior;
    enemy.isBoss = base.isBoss || false;

    // State
    enemy.rotation = Math.random() * Math.PI * 2;
    enemy.knockbackVx = 0;
    enemy.knockbackVy = 0;
    enemy.stunTimer = 0;
    enemy.slowFactor = 1;
    enemy.slowTimer = 0;
    enemy.frozenTimer = 0;
    enemy.flashTimer = 0;
    enemy.iFrameTimer = 0;
    enemy.spawnTime = 0; // set by wave system

    // Ranged enemy state
    enemy.fireTimer = base.fireRate || 2.0;
    enemy.preferredDist = base.preferredDist || 0;
    enemy.projectileSpeed = base.projectileSpeed || 0;
    enemy.projectileDamage = base.projectileDamage || 0;

    // Exploder state
    enemy.exploding = false;
    enemy.explodeTimer = 0;
    enemy.explodeRadius = base.explodeRadius || 0;
    enemy.explodeDamage = base.explodeDamage || 0;

    // Ghost state
    enemy.sineOffset = Math.random() * Math.PI * 2;
    enemy.sineAmplitude = base.sineAmplitude || 0;
    enemy.sineFrequency = base.sineFrequency || 0;
    enemy.noCollideEnemies = base.noCollideEnemies || false;

    // Boss state
    enemy.bossPhase = 0;
    enemy.bossPhaseTimer = 0;
    enemy.bossDashVx = 0;
    enemy.bossDashVy = 0;
    enemy.bossDashing = false;

    return enemy;
}

export function updateEnemy(enemy, dt, playerX, playerY, time) {
    if (enemy.stunTimer > 0) {
        enemy.stunTimer -= dt;
        return null; // no action while stunned
    }

    if (enemy.frozenTimer > 0) {
        enemy.frozenTimer -= dt;
        return null;
    }

    if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
    }

    if (enemy.flashTimer > 0) enemy.flashTimer -= dt;
    if (enemy.iFrameTimer > 0) enemy.iFrameTimer -= dt;

    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    let action = null;
    const speed = enemy.speed * enemy.slowFactor;

    switch (enemy.behavior) {
        case 'seek':
            enemy.vx = nx * speed;
            enemy.vy = ny * speed;
            break;

        case 'ranged':
            // Move toward preferred distance
            if (dist > enemy.preferredDist + 30) {
                enemy.vx = nx * speed;
                enemy.vy = ny * speed;
            } else if (dist < enemy.preferredDist - 30) {
                enemy.vx = -nx * speed * 0.6;
                enemy.vy = -ny * speed * 0.6;
            } else {
                // Strafe
                enemy.vx = -ny * speed * 0.3;
                enemy.vy = nx * speed * 0.3;
            }
            // Shoot
            enemy.fireTimer -= dt;
            if (enemy.fireTimer <= 0) {
                enemy.fireTimer = ENEMY_TYPES[enemy.type]?.fireRate || 2.0;
                action = {
                    type: 'shoot',
                    x: enemy.x, y: enemy.y,
                    dirX: nx, dirY: ny,
                    speed: enemy.projectileSpeed,
                    damage: enemy.projectileDamage
                };
            }
            break;

        case 'sine':
            // Move toward player with sine wave perpendicular offset
            const perpX = -ny;
            const perpY = nx;
            const sineVal = Math.sin(time * enemy.sineFrequency + enemy.sineOffset) * enemy.sineAmplitude;
            enemy.vx = nx * speed + perpX * sineVal * 0.5;
            enemy.vy = ny * speed + perpY * sineVal * 0.5;
            break;

        case 'boss':
            action = updateBoss(enemy, dt, playerX, playerY, nx, ny, dist, speed, time);
            break;

        default:
            enemy.vx = nx * speed;
            enemy.vy = ny * speed;
    }

    // Apply knockback
    enemy.vx += enemy.knockbackVx;
    enemy.vy += enemy.knockbackVy;
    enemy.knockbackVx *= 0.85;
    enemy.knockbackVy *= 0.85;
    if (Math.abs(enemy.knockbackVx) < 1) enemy.knockbackVx = 0;
    if (Math.abs(enemy.knockbackVy) < 1) enemy.knockbackVy = 0;

    // Move
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;

    // Rotation
    enemy.rotation += dt * (enemy.isBoss ? 0.3 : 1.5);

    // Exploder logic
    if (enemy.type === 'exploder' && enemy.exploding) {
        enemy.explodeTimer -= dt;
        if (enemy.explodeTimer <= 0) {
            action = {
                type: 'explode',
                x: enemy.x, y: enemy.y,
                radius: enemy.explodeRadius,
                damage: enemy.explodeDamage
            };
        }
    }

    return action;
}

function updateBoss(enemy, dt, playerX, playerY, nx, ny, dist, speed, time) {
    const hpRatio = enemy.hp / enemy.maxHp;
    let action = null;

    // Determine phase
    if (hpRatio <= 0.25) enemy.bossPhase = 3;
    else if (hpRatio <= 0.5) enemy.bossPhase = 2;
    else if (hpRatio <= 0.75) enemy.bossPhase = 1;
    else enemy.bossPhase = 0;

    enemy.bossPhaseTimer += dt;

    switch (enemy.bossPhase) {
        case 0: // Chase + radial shots
            enemy.vx = nx * speed;
            enemy.vy = ny * speed;
            if (enemy.bossPhaseTimer > 2.5) {
                enemy.bossPhaseTimer = 0;
                action = { type: 'radialShot', x: enemy.x, y: enemy.y, count: 8 };
            }
            break;

        case 1: // Summon minions
            enemy.vx = nx * speed * 0.5;
            enemy.vy = ny * speed * 0.5;
            if (enemy.bossPhaseTimer > 4) {
                enemy.bossPhaseTimer = 0;
                action = { type: 'summon', x: enemy.x, y: enemy.y, count: 5 };
            }
            break;

        case 2: // Dash attacks
            if (!enemy.bossDashing) {
                enemy.vx = nx * speed * 0.3;
                enemy.vy = ny * speed * 0.3;
                if (enemy.bossPhaseTimer > 2) {
                    enemy.bossDashing = true;
                    enemy.bossDashVx = nx * speed * 5;
                    enemy.bossDashVy = ny * speed * 5;
                    enemy.bossPhaseTimer = 0;
                }
            } else {
                enemy.vx = enemy.bossDashVx;
                enemy.vy = enemy.bossDashVy;
                enemy.bossDashVx *= 0.95;
                enemy.bossDashVy *= 0.95;
                if (Math.abs(enemy.bossDashVx) < 10) {
                    enemy.bossDashing = false;
                }
            }
            break;

        case 3: // Fury — all combined
            enemy.vx = nx * speed * 1.5;
            enemy.vy = ny * speed * 1.5;
            if (enemy.bossPhaseTimer > 1.5) {
                enemy.bossPhaseTimer = 0;
                const actions = ['radialShot', 'summon'];
                action = {
                    type: actions[Math.floor(Math.random() * actions.length)],
                    x: enemy.x, y: enemy.y,
                    count: action?.type === 'radialShot' ? 12 : 3
                };
            }
            break;
    }

    return action;
}

export function renderEnemy(enemy, ctx, renderer) {
    const color = enemy.flashTimer > 0 ? '#fff' :
        enemy.frozenTimer > 0 ? '#67e8f9' : enemy.color;

    // Boss HP bar
    if (enemy.isBoss) {
        const barW = enemy.radius * 3;
        const barH = 4;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - enemy.radius - 12;
        renderer.drawBar(barX, barY, barW, barH, enemy.hp / enemy.maxHp,
            'rgba(0,0,0,0.5)', '#a855f7', 'rgba(168,85,247,0.5)');
    }

    // Exploding flash
    if (enemy.type === 'exploder' && enemy.exploding) {
        const flash = Math.sin(performance.now() * 0.02) * 0.3 + 0.5;
        renderer.drawGlowCircle(enemy.x, enemy.y, enemy.radius + 4, `rgba(236,72,153,${flash})`, 20);
    }

    // Frozen indicator
    if (enemy.frozenTimer > 0) {
        renderer.strokeCircle(enemy.x, enemy.y, enemy.radius + 3, 'rgba(103,232,249,0.5)', 2);
    }

    // Draw shape
    if (enemy.sides === 0) {
        // Circle (exploder)
        renderer.drawGlowCircle(enemy.x, enemy.y, enemy.radius, color, 8);
    } else {
        renderer.drawGlowPolygon(enemy.x, enemy.y, enemy.radius, enemy.sides, enemy.rotation, color, 8);
    }

    // HP bar for non-full-health enemies (not boss, those have the big bar)
    if (!enemy.isBoss && enemy.hp < enemy.maxHp) {
        const barW = enemy.radius * 2;
        const barH = 2;
        renderer.drawBar(
            enemy.x - barW / 2, enemy.y - enemy.radius - 6,
            barW, barH, enemy.hp / enemy.maxHp,
            'rgba(0,0,0,0.5)', '#ef4444'
        );
    }
}

export function resetEnemy(enemy) {
    enemy.alive = false;
    enemy.hp = 0;
    enemy.stunTimer = 0;
    enemy.slowFactor = 1;
    enemy.slowTimer = 0;
    enemy.frozenTimer = 0;
    enemy.exploding = false;
    enemy.bossDashing = false;
    enemy.bossPhaseTimer = 0;
}
