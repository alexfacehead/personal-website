// player.js — Player entity: movement, dodge roll, magnet pickup, stats

import { FX } from '../engine/particles.js';

export class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 14;

        // Stats (base)
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 160;
        this.baseSpeed = 160;
        this.pickupRadius = 50;
        this.damageBonus = 0;
        this.armor = 0;
        this.cooldownReduction = 0;
        this.hpRegen = 0;
        this.critChance = 0;
        this.critMultiplier = 2.0;

        // XP / Leveling
        this.xp = 0;
        this.level = 1;
        this.xpToNext = 10;
        this.xpMultiplier = 1.0;
        this.revivesLeft = 0;
        this.lifesteal = 0;
        this.luckBonus = 0;
        this.areaBonus = 0;
        this.bonusProjectiles = 0;
        this.durationBonus = 0;
        this.doubleXpChance = 0;
        this.shieldCharges = 0;
        this.shieldMaxCharges = 0;
        this.shieldRechargeTime = 15;
        this.shieldTimer = 0;

        // Dodge roll
        this.dodgeCooldown = 0;
        this.dodgeCooldownMax = 1.5;
        this.dodgeTimer = 0;
        this.dodgeDuration = 0.25;
        this.dodgeSpeed = 500;
        this.dodgeDirX = 0;
        this.dodgeDirY = 0;
        this.invincible = false;
        this.invincibleTimer = 0;

        // Damage flash
        this.flashTimer = 0;

        // i-frames after hit
        this.hitIFrames = 0;
        this.hitIFramesDuration = 0.5;

        // Weapons held (ids)
        this.weapons = [];
        // Passive upgrade levels { id: level }
        this.passives = {};
        // Synergies active
        this.synergies = {};
        // Weapons discovered (ever seen in upgrade choices)
        this.discoveredWeapons = new Set();

        // Stats tracking
        this.kills = 0;
        this.damageDealt = 0;
        this.survivalTime = 0;
        this.gemsCollected = 0;

        // Rotation for visual
        this.rotation = 0;

        this.alive = true;
    }

    update(dt, input, particles, audio) {
        if (!this.alive) return;

        this.survivalTime += dt;

        // Regen
        if (this.hpRegen > 0) {
            this.hp = Math.min(this.hp + this.hpRegen * dt, this.maxHp);
        }

        const move = input.getMovementVector();

        // Dodge roll
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

        if (input.isDodge() && this.dodgeCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
            this.dodgeTimer = this.dodgeDuration;
            this.dodgeCooldown = this.dodgeCooldownMax;
            this.dodgeDirX = move.x;
            this.dodgeDirY = move.y;
            this.invincible = true;
            this.invincibleTimer = this.dodgeDuration + 0.05;
            if (audio) audio.dodge();
        }

        if (this.dodgeTimer > 0) {
            this.dodgeTimer -= dt;
            this.vx = this.dodgeDirX * this.dodgeSpeed;
            this.vy = this.dodgeDirY * this.dodgeSpeed;

            // Dodge trail particles
            if (particles) {
                particles.emit(FX.dodgeTrail(this.x, this.y));
            }
        } else {
            const speedMult = this._bloodRushActive ? 1.25 : 1.0;
            this.vx = move.x * this.speed * speedMult;
            this.vy = move.y * this.speed * speedMult;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Invincibility timer
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) this.invincible = false;
        }

        // Hit i-frames
        if (this.hitIFrames > 0) {
            this.hitIFrames -= dt;
        }

        // Damage flash
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

        // Shield recharge
        if (this.shieldMaxCharges > 0 && this.shieldCharges < this.shieldMaxCharges) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldCharges++;
                this.shieldTimer = this.shieldRechargeTime;
            }
        }

        // Slow rotation for visual flair
        this.rotation += dt * 0.5;

        // Blood Rush synergy: below 40% HP buffs
        if (this.synergies.bloodRush) {
            const hpRatio = this.hp / this.maxHp;
            const wasActive = this._bloodRushActive;
            this._bloodRushActive = hpRatio < 0.4;
            if (this._bloodRushActive) {
                this._bloodRushDamageBonus = 0.40;
                this._bloodRushCdrBonus = 0.50;
            } else {
                this._bloodRushDamageBonus = 0;
                this._bloodRushCdrBonus = 0;
            }
        }
    }

    takeDamage(amount, audio) {
        if (this.invincible || this.hitIFrames > 0) return false;

        // Void Shield: absorb hit
        if (this.shieldCharges > 0) {
            this.shieldCharges--;
            this.shieldTimer = this.shieldRechargeTime;
            this.flashTimer = 0.1;
            this.hitIFrames = 0.3;
            return false;
        }

        const finalDamage = Math.max(1, amount - this.armor);
        this.hp -= finalDamage;
        this.flashTimer = 0.15;
        this.damageFlashTimer = 0.25;
        this.hitIFrames = this.hitIFramesDuration;

        // Iron Skin: reflect 50% damage
        if (this.synergies.ironSkin) {
            this._reflectDamage = Math.floor(amount * 0.5);
        }

        // Juggernaut: trigger shockwave
        if (this.synergies.juggernaut) {
            this._juggernautShockwave = true;
        }

        if (audio) audio.hit();

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }

        return true;
    }

    addXp(amount, particles, audio) {
        const synergyMult = this.synergies.vortexMagnet ? 1.5 : 1.0;
        const dblXp = (this.doubleXpChance > 0 && Math.random() < this.doubleXpChance) ? 2.0 : 1.0;
        this.xp += Math.floor(amount * synergyMult * this.xpMultiplier * dblXp);
        this.gemsCollected++;

        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(10 * Math.pow(1.15, this.level - 1));

            if (particles) particles.emit(FX.levelUp(this.x, this.y));
            if (audio) audio.levelUp();

            return true; // Signal level up
        }
        return false;
    }

    render(ctx, renderer) {
        if (!this.alive) return;

        // Flash white on damage
        const color = this.flashTimer > 0 ? '#fff' :
            this.invincible ? 'rgba(168,85,247,0.6)' : '#a855f7';
        const glowColor = this.invincible ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.6)';

        // Blink when i-frames active
        if (this.hitIFrames > 0 && Math.floor(this.hitIFrames * 15) % 2 === 0) return;

        // Pickup radius indicator
        if (this.pickupRadius > 30) {
            ctx.strokeStyle = 'rgba(34,197,94,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.pickupRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Dodge cooldown ring
        if (this.dodgeCooldown > 0) {
            const progress = 1 - this.dodgeCooldown / this.dodgeCooldownMax;
            ctx.strokeStyle = 'rgba(168,85,247,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
        }

        // Damage flash — red expanding ring
        if (this.damageFlashTimer > 0) {
            const t = this.damageFlashTimer / 0.25;
            const ringRadius = this.radius + 15 * (1 - t);
            ctx.save();
            ctx.strokeStyle = `rgba(239, 68, 68, ${t * 0.8})`;
            ctx.lineWidth = 2 * t;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10 * t;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Player body — glowing hexagon
        renderer.drawGlowPolygon(this.x, this.y, this.radius, 6, this.rotation, color, 15);

        // Inner detail
        renderer.drawPolygon(this.x, this.y, this.radius * 0.5, 6, -this.rotation * 1.5, glowColor);

        // Direction indicator
        const move = { x: this.vx, y: this.vy };
        const moveLen = Math.sqrt(move.x * move.x + move.y * move.y);
        if (moveLen > 10) {
            const nx = move.x / moveLen;
            const ny = move.y / moveLen;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + nx * (this.radius + 2), this.y + ny * (this.radius + 2));
            ctx.lineTo(this.x + nx * (this.radius + 8), this.y + ny * (this.radius + 8));
            ctx.stroke();
        }
    }
}
