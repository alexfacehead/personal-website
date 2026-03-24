// combat.js — Damage formula, knockback, i-frames, crits, damage numbers

export function calculateDamage(baseDamage, damageBonus = 0, critChance = 0, critMultiplier = 2) {
    let damage = baseDamage * (1 + damageBonus);
    let isCrit = false;

    if (critChance > 0 && Math.random() < critChance) {
        damage *= critMultiplier;
        isCrit = true;
    }

    return { damage: Math.max(1, Math.floor(damage)), isCrit };
}

export function applyDamageToEnemy(enemy, baseDamage, player, particles, audio, FX) {
    if (enemy.iFrameTimer > 0) return { dealt: 0, killed: false };

    const totalDamageBonus = (player.damageBonus || 0) + (player._bloodRushDamageBonus || 0);
    const critMult = player.synergies?.overcharge ? 3.0 : (player.critMultiplier || 2);
    const { damage, isCrit } = calculateDamage(
        baseDamage,
        totalDamageBonus,
        player.critChance,
        critMult
    );

    // Hex Ring damage amplification
    const hexAmp = (enemy._hexed && enemy._hexTimer > 0) ? (1 + enemy._hexed) : 1;
    const finalDmg = damage * hexAmp;
    enemy.hp -= finalDmg;
    enemy.flashTimer = 0.1;
    enemy.iFrameTimer = 0.05; // Brief i-frames to prevent multi-hit in same frame

    player.damageDealt += finalDmg;

    // Lifesteal (capped at 1 HP per hit, max 5 HP/sec)
    if (player.lifesteal > 0) {
        const now = performance.now();
        if (!player._lifestealLastReset || now - player._lifestealLastReset > 1000) {
            player._lifestealLastReset = now;
            player._lifestealThisSec = 0;
        }
        if (player._lifestealThisSec < 5) {
            const healed = Math.min(finalDmg * player.lifesteal, 1);
            player.hp = Math.min(player.maxHp, player.hp + healed);
            player._lifestealThisSec += healed;
        }
    }

    if (particles && FX) {
        particles.emit(FX.damage(enemy.x, enemy.y));
    }
    if (audio) audio.hit();

    if (enemy.hp <= 0) {
        return { dealt: finalDmg, killed: true, isCrit };
    }

    return { dealt: finalDmg, killed: false, isCrit };
}

export function applyKnockback(enemy, sourceX, sourceY, force) {
    const dx = enemy.x - sourceX;
    const dy = enemy.y - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const resist = 1 - (enemy.knockbackResist || 0);
    enemy.knockbackVx += (dx / dist) * force * resist;
    enemy.knockbackVy += (dy / dist) * force * resist;
}

export function applySlow(enemy, slowPercent, duration) {
    enemy.slowFactor = Math.min(enemy.slowFactor, 1 - slowPercent);
    enemy.slowTimer = Math.max(enemy.slowTimer, duration);
}

export function applyFreeze(enemy, duration) {
    enemy.frozenTimer = Math.max(enemy.frozenTimer, duration);
}

export function applyStun(enemy, duration) {
    enemy.stunTimer = Math.max(enemy.stunTimer, duration);
}

// Check circle vs circle collision
export function circlesCollide(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const distSq = dx * dx + dy * dy;
    const radii = ar + br;
    return distSq <= radii * radii;
}

// Separation steering — push enemies apart to prevent stacking
export function applySeparation(enemies, spatialHash) {
    const sepDist = 20;
    const sepForce = 100;

    enemies.forEachForward((enemy) => {
        if (enemy.noCollideEnemies) return;

        const nearby = spatialHash.queryRadius(enemy.x, enemy.y, sepDist * 2);
        for (const other of nearby) {
            if (other === enemy || !other.alive || other.noCollideEnemies) continue;

            const dx = enemy.x - other.x;
            const dy = enemy.y - other.y;
            const distSq = dx * dx + dy * dy;
            const minDist = enemy.radius + other.radius + 2;

            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                enemy.x += nx * overlap * 0.5;
                enemy.y += ny * overlap * 0.5;
            }
        }
    });
}
