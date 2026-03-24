// pickup.js — XP gems, health orbs, treasure chests

export const PICKUP_TYPES = {
    xp_small: { xp: 1, color: '#22c55e', size: 4, shape: 'diamond' },
    xp_medium: { xp: 5, color: '#3b82f6', size: 6, shape: 'diamond' },
    xp_large: { xp: 20, color: '#a855f7', size: 8, shape: 'diamond' },
    health: { heal: 20, color: '#ef4444', size: 6, shape: 'cross' },
    chest: { isChest: true, color: '#fbbf24', size: 10, shape: 'rect' }
};

export function initPickup(pickup, type, x, y) {
    const def = PICKUP_TYPES[type];
    pickup.type = type;
    pickup.x = x;
    pickup.y = y;
    pickup.vx = (Math.random() - 0.5) * 80;
    pickup.vy = (Math.random() - 0.5) * 80;
    pickup.xp = def.xp || 0;
    pickup.heal = def.heal || 0;
    pickup.isChest = def.isChest || false;
    pickup.color = def.color;
    pickup.size = def.size;
    pickup.shape = def.shape;
    pickup.radius = def.size;
    pickup.age = 0;
    pickup.attracted = false;
    pickup.bobPhase = Math.random() * Math.PI * 2;
    return pickup;
}

export function updatePickup(pickup, dt, playerX, playerY, pickupRadius) {
    pickup.age += dt;
    pickup.bobPhase += dt * 3;

    // Initial scatter velocity decays
    pickup.vx *= 0.92;
    pickup.vy *= 0.92;

    const dx = playerX - pickup.x;
    const dy = playerY - pickup.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Magnetic attraction when within pickup radius
    if (dist < pickupRadius) {
        pickup.attracted = true;
        const attractSpeed = 400 + (1 - dist / pickupRadius) * 300;
        pickup.vx = (dx / dist) * attractSpeed;
        pickup.vy = (dy / dist) * attractSpeed;
    }

    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;

    // Check collection
    if (dist < 16) {
        return true; // collected
    }

    return false;
}

export function renderPickup(pickup, ctx, renderer) {
    const bob = Math.sin(pickup.bobPhase) * 2;
    const y = pickup.y + bob;
    const s = pickup.size;

    // Sparkle effect
    const sparkle = Math.sin(pickup.age * 5 + pickup.bobPhase) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = sparkle;

    switch (pickup.shape) {
        case 'diamond':
            ctx.fillStyle = pickup.color;
            ctx.save();
            ctx.shadowColor = pickup.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(pickup.x, y - s);
            ctx.lineTo(pickup.x + s * 0.6, y);
            ctx.lineTo(pickup.x, y + s);
            ctx.lineTo(pickup.x - s * 0.6, y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;

        case 'cross':
            ctx.fillStyle = pickup.color;
            ctx.save();
            ctx.shadowColor = pickup.color;
            ctx.shadowBlur = 8;
            const t = s * 0.3;
            ctx.fillRect(pickup.x - t, y - s, t * 2, s * 2);
            ctx.fillRect(pickup.x - s, y - t, s * 2, t * 2);
            ctx.restore();
            break;

        case 'rect':
            ctx.fillStyle = pickup.color;
            ctx.save();
            ctx.shadowColor = pickup.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(pickup.x - s, y - s * 0.7, s * 2, s * 1.4);
            // Chest detail
            ctx.fillStyle = '#92400e';
            ctx.fillRect(pickup.x - s + 2, y - 1, s * 2 - 4, 2);
            ctx.restore();
            break;
    }

    ctx.restore();
}

export function resetPickup(pickup) {
    pickup.alive = false;
    pickup.attracted = false;
    pickup.age = 0;
}
