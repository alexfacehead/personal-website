// hud.js — Canvas-rendered HUD: HP bar, XP bar, timer, kills, weapon icons, FPS

export class HUD {
    constructor() {
        this.fpsHistory = [];
        this.showFps = false;
        this.damageNumbers = [];
    }

    addDamageNumber(x, y, damage, isCrit) {
        this.damageNumbers.push({
            x, y, damage: Math.floor(damage), isCrit,
            life: 0, maxLife: 0.6,
            vy: -60
        });
    }

    update(dt) {
        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.life += dt;
            dn.y += dn.vy * dt;
            dn.vy += 40 * dt; // gravity
            if (dn.life >= dn.maxLife) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }

    renderWorldSpace(ctx, renderer) {
        // Damage numbers (in world space)
        for (const dn of this.damageNumbers) {
            if (!renderer.isVisible(dn.x, dn.y, 30)) continue;
            const alpha = 1 - (dn.life / dn.maxLife);
            const size = dn.isCrit ? 16 : 12;
            const color = dn.isCrit ? '#fbbf24' : '#fff';
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.font = `bold ${size}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dn.damage.toString(), dn.x, dn.y);
        }
        ctx.globalAlpha = 1;
    }

    render(ctx, renderer, player, waveSystem, fps) {
        const w = renderer.w;
        const h = renderer.h;
        const pad = 12;

        // --- HP Bar (top left) ---
        const hpBarW = 180;
        const hpBarH = 12;
        const hpX = pad;
        const hpY = pad;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(hpX - 1, hpY - 1, hpBarW + 2, hpBarH + 2);

        // HP fill
        const hpRatio = player.hp / player.maxHp;
        const hpColor = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpX, hpY, hpBarW * Math.max(0, hpRatio), hpBarH);

        // HP text
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, hpX + hpBarW / 2, hpY + hpBarH / 2);

        // --- Level (next to HP) ---
        ctx.fillStyle = '#fbbf24';
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`LV ${player.level}`, hpX + hpBarW + 10, hpY);

        // --- Timer (top center) ---
        ctx.fillStyle = '#ccc';
        ctx.font = "bold 18px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(waveSystem.getTimerDisplay(), w / 2, pad);

        // Surge indicator
        if (waveSystem.surgeActive) {
            ctx.fillStyle = '#ef4444';
            ctx.font = "bold 12px 'JetBrains Mono', monospace";
            ctx.fillText('SURGE!', w / 2, pad + 22);
        }

        // --- Kill count (top right) ---
        ctx.fillStyle = '#ccc';
        ctx.font = "14px 'JetBrains Mono', monospace";
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Kills: ${player.kills}`, w - pad, pad);

        // --- XP Bar (bottom, full width) ---
        const xpBarH = 6;
        const xpY = h - xpBarH;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, xpY, w, xpBarH);

        const xpRatio = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, xpY, w * xpRatio, xpBarH);

        // --- Weapon icons (bottom left) ---
        const iconSize = 24;
        const iconY = h - xpBarH - iconSize - pad;
        const weaponInfo = player.weapons || [];

        // We'll draw simple colored squares with weapon initials
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Note: weapon info would need to be passed in; for now we skip icons
        // They'll be added when WeaponManager info is available

        // --- Dodge cooldown (bottom right) ---
        if (player.dodgeCooldown > 0) {
            const dodgeRatio = 1 - player.dodgeCooldown / player.dodgeCooldownMax;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(w - pad - 60, h - xpBarH - 20 - pad, 60, 20);
            ctx.fillStyle = 'rgba(168,85,247,0.5)';
            ctx.fillRect(w - pad - 60, h - xpBarH - 20 - pad, 60 * dodgeRatio, 20);
            ctx.fillStyle = '#aaa';
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillText('DODGE', w - pad - 30, h - xpBarH - 10 - pad);
        }

        // --- FPS counter (debug) ---
        if (this.showFps) {
            ctx.fillStyle = '#666';
            ctx.font = "12px 'JetBrains Mono', monospace";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`FPS: ${Math.round(fps)}`, w - pad, pad + 20);
        }
    }
}
