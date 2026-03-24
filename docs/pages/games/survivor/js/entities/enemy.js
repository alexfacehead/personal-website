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

    // Rainbow Watcher state
    enemy.isRainbowWatcher = base.isRainbowWatcher || false;
    enemy.rwState = null; // initialized on first update

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
    if (enemy._hexTimer > 0) enemy._hexTimer -= dt;

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

        case 'rainbowWatcher':
            action = updateRainbowWatcher(enemy, dt, playerX, playerY, nx, ny, dist, speed, time);
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

function updateRainbowWatcher(enemy, dt, playerX, playerY, nx, ny, dist, speed, time) {
    const hpRatio = enemy.hp / enemy.maxHp;
    let action = null;

    // Init soulslike state
    if (!enemy.rwState) {
        enemy.rwState = {
            mode: 'orbit',        // current sub-state
            orbitAngle: 0,        // angle around player
            orbitDir: 1,          // CW or CCW
            orbitDist: 200,       // preferred orbit distance
            actionTimer: 0,       // time until next action
            windupTimer: 0,       // telegraph before attack
            isWindingUp: false,
            nextAction: null,
            dashTarget: null,
            dashSpeed: 0,
            blinkCooldown: 0,
            comboCount: 0,
            sweepAngle: 0,
            irisColor: '#ef4444', // eye iris color
            pupilSize: 1.0,
            gazeAngle: 0,
            idleTimer: 0
        };
    }
    const rw = enemy.rwState;

    // Phase determination
    if (hpRatio <= 0.15) enemy.bossPhase = 3;
    else if (hpRatio <= 0.4) enemy.bossPhase = 2;
    else if (hpRatio <= 0.7) enemy.bossPhase = 1;
    else enemy.bossPhase = 0;

    // Eye tracks player
    rw.gazeAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
    rw.pupilSize = 0.8 + Math.sin(time * 2) * 0.1;

    // Rainbow color cycling
    const hue = (time * 60) % 360;
    rw.irisColor = `hsl(${hue}, 80%, 60%)`;

    rw.actionTimer -= dt;
    if (rw.blinkCooldown > 0) rw.blinkCooldown -= dt;

    // Windup telegraph
    if (rw.isWindingUp) {
        rw.windupTimer -= dt;
        // Slow movement during windup
        enemy.vx *= 0.8;
        enemy.vy *= 0.8;
        if (rw.windupTimer <= 0) {
            rw.isWindingUp = false;
            // Execute the telegraphed action
            action = rw.nextAction;
            rw.nextAction = null;
        }
        return action;
    }

    switch (enemy.bossPhase) {
        case 0: // ORBIT — circles player, periodic aimed shots
            rw.orbitAngle += rw.orbitDir * dt * 1.2;
            // Smoothly adjust orbit distance
            const targetDist0 = 180 + Math.sin(time * 0.5) * 40;
            rw.orbitDist += (targetDist0 - rw.orbitDist) * dt * 2;

            const ox0 = playerX + Math.cos(rw.orbitAngle) * rw.orbitDist;
            const oy0 = playerY + Math.sin(rw.orbitAngle) * rw.orbitDist;
            enemy.vx = (ox0 - enemy.x) * 3;
            enemy.vy = (oy0 - enemy.y) * 3;

            // Periodically reverse orbit direction
            if (rw.actionTimer <= 0) {
                rw.actionTimer = 2.0 + Math.random() * 1.5;
                if (Math.random() < 0.3) {
                    rw.orbitDir *= -1;
                } else {
                    // Telegraph a shot
                    rw.isWindingUp = true;
                    rw.windupTimer = 0.6;
                    rw.nextAction = {
                        type: 'radialShot', x: enemy.x, y: enemy.y,
                        count: 5, aimed: true,
                        dirX: nx, dirY: ny
                    };
                }
            }
            break;

        case 1: // BLINK — teleport behind player, shoot fan
            rw.orbitAngle += rw.orbitDir * dt * 1.8;
            const targetDist1 = 160;
            const ox1 = playerX + Math.cos(rw.orbitAngle) * targetDist1;
            const oy1 = playerY + Math.sin(rw.orbitAngle) * targetDist1;
            enemy.vx = (ox1 - enemy.x) * 3;
            enemy.vy = (oy1 - enemy.y) * 3;

            if (rw.actionTimer <= 0 && rw.blinkCooldown <= 0) {
                rw.actionTimer = 2.5 + Math.random();
                rw.blinkCooldown = 3.0;
                // Teleport behind player
                const behindAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x) + Math.PI;
                enemy.x = playerX + Math.cos(behindAngle) * 120;
                enemy.y = playerY + Math.sin(behindAngle) * 120;
                rw.orbitAngle = behindAngle;
                // Immediate fan shot after blink
                rw.isWindingUp = true;
                rw.windupTimer = 0.35;
                rw.nextAction = {
                    type: 'fanShot', x: enemy.x, y: enemy.y,
                    count: 7, spread: 1.2,
                    dirX: -Math.cos(behindAngle), dirY: -Math.sin(behindAngle)
                };
            }
            break;

        case 2: // BARRAGE — aggressive dash combos + projectile sweeps
            rw.idleTimer -= dt;

            if (rw.mode === 'orbit') {
                // Brief orbit then dash
                rw.orbitAngle += rw.orbitDir * dt * 2.2;
                const ox2 = playerX + Math.cos(rw.orbitAngle) * 150;
                const oy2 = playerY + Math.sin(rw.orbitAngle) * 150;
                enemy.vx = (ox2 - enemy.x) * 3;
                enemy.vy = (oy2 - enemy.y) * 3;

                if (rw.actionTimer <= 0) {
                    rw.mode = 'dash_windup';
                    rw.isWindingUp = true;
                    rw.windupTimer = 0.4;
                    rw.nextAction = { type: 'bossDash' };
                    rw.dashTarget = { x: playerX, y: playerY };
                    rw.actionTimer = 1.5;
                }
            } else if (rw.mode === 'dashing') {
                enemy.vx = rw.dashSpeed * Math.cos(rw.sweepAngle);
                enemy.vy = rw.dashSpeed * Math.sin(rw.sweepAngle);
                rw.dashSpeed *= 0.94;
                if (rw.dashSpeed < 20) {
                    rw.comboCount++;
                    if (rw.comboCount < 3) {
                        // Chain into another dash
                        rw.mode = 'orbit';
                        rw.actionTimer = 0.5;
                    } else {
                        // End combo with radial burst
                        rw.comboCount = 0;
                        rw.mode = 'orbit';
                        rw.actionTimer = 2.0;
                        action = { type: 'radialShot', x: enemy.x, y: enemy.y, count: 12 };
                    }
                }
            }
            break;

        case 3: // DEATHGAZE — continuous beam sweep + everything
            rw.orbitAngle += rw.orbitDir * dt * 0.8;
            const ox3 = playerX + Math.cos(rw.orbitAngle) * 130;
            const oy3 = playerY + Math.sin(rw.orbitAngle) * 130;
            enemy.vx = (ox3 - enemy.x) * 2;
            enemy.vy = (oy3 - enemy.y) * 2;

            if (rw.actionTimer <= 0) {
                rw.actionTimer = 1.0 + Math.random() * 0.5;
                const roll = Math.random();
                if (roll < 0.3) {
                    action = { type: 'radialShot', x: enemy.x, y: enemy.y, count: 16 };
                } else if (roll < 0.5) {
                    action = { type: 'summon', x: enemy.x, y: enemy.y, count: 4 };
                } else if (roll < 0.7 && rw.blinkCooldown <= 0) {
                    rw.blinkCooldown = 2.0;
                    const behindAngle = Math.atan2(playerY - enemy.y, playerX - enemy.x) + Math.PI;
                    enemy.x = playerX + Math.cos(behindAngle) * 100;
                    enemy.y = playerY + Math.sin(behindAngle) * 100;
                    action = { type: 'radialShot', x: enemy.x, y: enemy.y, count: 20 };
                } else {
                    rw.isWindingUp = true;
                    rw.windupTimer = 0.3;
                    rw.nextAction = {
                        type: 'fanShot', x: enemy.x, y: enemy.y,
                        count: 12, spread: 2.0,
                        dirX: nx, dirY: ny
                    };
                }
            }
            break;
    }

    // Handle dash execution from windup
    if (action && action.type === 'bossDash' && rw.dashTarget) {
        rw.mode = 'dashing';
        const dx = rw.dashTarget.x - enemy.x;
        const dy = rw.dashTarget.y - enemy.y;
        rw.sweepAngle = Math.atan2(dy, dx);
        rw.dashSpeed = speed * 8;
        action = null; // dash is movement, not a spawn action
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

    // Rainbow Watcher custom eye rendering
    if (enemy.isRainbowWatcher && enemy.rwState) {
        const rw = enemy.rwState;
        const r = enemy.radius;
        const t = performance.now() * 0.001;

        // Outer eye shape — almond/eye shape
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Rainbow glow aura
        const hue = (t * 60) % 360;
        ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
        ctx.shadowBlur = rw.isWindingUp ? 30 : 15;

        // Eye white (almond shape)
        ctx.fillStyle = enemy.flashTimer > 0 ? '#fff' : 'rgba(220,220,240,0.9)';
        ctx.beginPath();
        ctx.moveTo(-r * 1.4, 0);
        ctx.quadraticCurveTo(0, -r * 1.1, r * 1.4, 0);
        ctx.quadraticCurveTo(0, r * 1.1, -r * 1.4, 0);
        ctx.closePath();
        ctx.fill();

        // Eye outline with rainbow
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Second outline ring
        ctx.strokeStyle = `hsl(${(hue + 120) % 360}, 80%, 60%)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 1.55, 0);
        ctx.quadraticCurveTo(0, -r * 1.25, r * 1.55, 0);
        ctx.quadraticCurveTo(0, r * 1.25, -r * 1.55, 0);
        ctx.closePath();
        ctx.stroke();

        // Iris
        const pupilOffX = Math.cos(rw.gazeAngle) * r * 0.25;
        const pupilOffY = Math.sin(rw.gazeAngle) * r * 0.25;

        // Iris gradient (rainbow)
        const irisR = r * 0.55;
        const irisGrad = ctx.createRadialGradient(pupilOffX, pupilOffY, 0, pupilOffX, pupilOffY, irisR);
        irisGrad.addColorStop(0, '#111');
        irisGrad.addColorStop(0.35, `hsl(${hue}, 90%, 50%)`);
        irisGrad.addColorStop(0.6, `hsl(${(hue + 60) % 360}, 85%, 55%)`);
        irisGrad.addColorStop(0.85, `hsl(${(hue + 180) % 360}, 80%, 50%)`);
        irisGrad.addColorStop(1.0, `hsl(${(hue + 240) % 360}, 75%, 45%)`);

        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(pupilOffX, pupilOffY, irisR, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        const pupilR = r * 0.22 * rw.pupilSize;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(pupilOffX, pupilOffY, pupilR, 0, Math.PI * 2);
        ctx.fill();

        // Pupil highlight
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(pupilOffX - pupilR * 0.3, pupilOffY - pupilR * 0.4, pupilR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Windup indicator — eye narrows/pulses
        if (rw.isWindingUp) {
            ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${0.3 + Math.sin(t * 20) * 0.2})`;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();

        // Boss HP bar with rainbow gradient
        const barW = r * 4;
        const barH = 5;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - r * 1.5 - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        const hpRatio = enemy.hp / enemy.maxHp;
        const barGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
        barGrad.addColorStop(0, `hsl(${hue}, 80%, 55%)`);
        barGrad.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 80%, 55%)`);
        barGrad.addColorStop(1, `hsl(${(hue + 240) % 360}, 80%, 55%)`);
        ctx.fillStyle = barGrad;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // Boss name
        ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RAINBOW WATCHER', enemy.x, barY - 4);
        ctx.textAlign = 'start';
    } else if (enemy.sides === 0) {
        // Circle (exploder)
        renderer.drawGlowCircle(enemy.x, enemy.y, enemy.radius, color, 8);
    } else {
        renderer.drawGlowPolygon(enemy.x, enemy.y, enemy.radius, enemy.sides, enemy.rotation, color, 8);
    }

    // HP bar for non-full-health enemies (not boss/rainbow, those have their own)
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
