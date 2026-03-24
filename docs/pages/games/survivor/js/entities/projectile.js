// projectile.js — Projectiles for player weapons and enemy attacks

export function initProjectile(proj, config) {
    proj.x = config.x;
    proj.y = config.y;
    proj.vx = config.vx || config.dirX * config.speed;
    proj.vy = config.vy || config.dirY * config.speed;
    proj.speed = config.speed || 200;
    proj.damage = config.damage || 10;
    proj.radius = config.radius || 5;
    proj.pierce = config.pierce || 0;
    proj.pierceCount = 0;
    proj.lifetime = config.lifetime || 3;
    proj.age = 0;
    proj.isPlayerOwned = config.isPlayerOwned !== false;
    proj.color = config.color || (proj.isPlayerOwned ? '#3b82f6' : '#ef4444');
    proj.homing = config.homing || 0;
    proj.homingTarget = null;
    proj.trailTimer = 0;
    proj.hitEntities = new Set();
    return proj;
}

export function updateProjectile(proj, dt, enemies, playerX, playerY) {
    proj.age += dt;

    if (proj.age >= proj.lifetime) {
        return false; // dead
    }

    // Homing behavior
    if (proj.homing > 0 && proj.isPlayerOwned) {
        let nearest = null;
        let nearestDist = Infinity;

        // Find nearest enemy
        if (enemies) {
            enemies.forEachForward((enemy) => {
                if (proj.hitEntities.has(enemy)) return;
                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                const d = dx * dx + dy * dy;
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = enemy;
                }
            });
        }

        if (nearest) {
            const dx = nearest.x - proj.x;
            const dy = nearest.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetVx = (dx / dist) * proj.speed;
            const targetVy = (dy / dist) * proj.speed;
            proj.vx += (targetVx - proj.vx) * proj.homing * dt;
            proj.vy += (targetVy - proj.vy) * proj.homing * dt;

            // Re-normalize speed
            const currentSpeed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
            if (currentSpeed > 0) {
                proj.vx = (proj.vx / currentSpeed) * proj.speed;
                proj.vy = (proj.vy / currentSpeed) * proj.speed;
            }
        }
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    return true; // alive
}

export function renderProjectile(proj, ctx, renderer) {
    const glow = proj.isPlayerOwned ? 10 : 6;
    renderer.drawGlowCircle(proj.x, proj.y, proj.radius, proj.color, glow);

    // Trail effect
    const trailAlpha = 0.3;
    ctx.globalAlpha = trailAlpha;
    const trailLen = 3;
    for (let i = 1; i <= trailLen; i++) {
        const t = i / trailLen;
        const tx = proj.x - proj.vx * 0.01 * i;
        const ty = proj.y - proj.vy * 0.01 * i;
        const r = proj.radius * (1 - t * 0.5);
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function resetProjectile(proj) {
    proj.alive = false;
    proj.hitEntities.clear();
    proj.homingTarget = null;
    proj.pierceCount = 0;
    proj.age = 0;
}
