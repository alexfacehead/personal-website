// hud.js — Canvas-rendered HUD: HP bar, XP bar, timer, kills, weapon icons, FPS

export class HUD {
    constructor() {
        this.fpsHistory = [];
        this.showFps = false;
        this.damageNumbers = [];
        this.notifications = []; // { text, color, life, maxLife }
    }

    showNotification(text, color = '#f59e0b', duration = 3.0) {
        this.notifications.push({ text, color, life: 0, maxLife: duration });
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

        // Update notifications
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            this.notifications[i].life += dt;
            if (this.notifications[i].life >= this.notifications[i].maxLife) {
                this.notifications.splice(i, 1);
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

    render(ctx, renderer, player, waveSystem, fps, coins, weaponManager) {
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

        // --- Level (below HP bar) ---
        ctx.fillStyle = '#fbbf24';
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`LV ${player.level}`, hpX, hpY + hpBarH + 4);

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

        // --- Coins (top right, below kills) ---
        if (coins !== undefined) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = "12px 'JetBrains Mono', monospace";
            ctx.textAlign = 'right';
            ctx.fillText(`Coins: ${coins}`, w - pad, pad + 18);
        }

        // --- XP Bar (bottom, full width) ---
        const xpBarH = 6;
        const isMobileXp = ('ontouchstart' in window) && w < 900;
        const xpBottomSafe = isMobileXp ? 28 : 0;
        const xpY = h - xpBarH - xpBottomSafe;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, xpY, w, xpBarH);

        const xpRatio = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, xpY, w * xpRatio, xpBarH);

        // --- Weapon Bar (bottom left) ---
        const slotSize = 32;
        const slotGap = 4;
        const maxSlots = player.maxWeapons || 6;
        // Extra padding on mobile for Safari toolbar / safe area
        const isMobile = ('ontouchstart' in window) && w < 900;
        const bottomSafe = isMobile ? 28 : 0;
        const barY = h - xpBarH - slotSize - pad - 4 - bottomSafe;
        const barX = pad;

        // Get weapon info from manager
        const weaponList = weaponManager ? weaponManager.getWeaponInfo() : [];

        // Get active synergies to check which weapons participate
        const activeSynergies = player.synergies || {};
        const SYNERGY_WEAPON_MAP = {
            frozenLightning: ['frost', 'lightning'], voidNova: ['nova', 'orbital'],
            guidedBeam: ['beam', 'missile'], gravityFreeze: ['gravity', 'frost'],
            acidStorm: ['voidRain', 'lightning'], phantomArmy: ['temporalEcho', 'shadowSwarm'],
            eventHorizon: ['singularityCannon', 'gravity'], sentinelGrid: ['pulseWard', 'orbital'],
            bladeStorm: ['phantomBlade', 'nova'], voidSiphon: ['voidRift', 'missile']
        };

        // Build set of weapons that have active synergies
        const synergyWeapons = new Set();
        for (const [synKey, active] of Object.entries(activeSynergies)) {
            if (!active) continue;
            const weapons = SYNERGY_WEAPON_MAP[synKey];
            if (weapons) weapons.forEach(w => synergyWeapons.add(w));
        }

        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < maxSlots; i++) {
            const sx = barX + i * (slotSize + slotGap);
            const sy = barY;
            const weapon = weaponList[i];

            if (weapon) {
                const hasSynergy = synergyWeapons.has(weapon.id);

                // Synergy glow border
                if (hasSynergy) {
                    const hue = (performance.now() * 0.1) % 360;
                    ctx.save();
                    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
                    ctx.shadowBlur = 8;
                    ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(sx - 1, sy - 1, slotSize + 2, slotSize + 2);
                    ctx.restore();
                }

                // Slot background
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(sx, sy, slotSize, slotSize);

                // Weapon color fill (subtle)
                ctx.fillStyle = weapon.color + '20';
                ctx.fillRect(sx, sy, slotSize, slotSize);

                // Border
                ctx.strokeStyle = weapon.color + '88';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx, sy, slotSize, slotSize);

                // Weapon initial
                ctx.fillStyle = weapon.color;
                const initial = weapon.name.charAt(0).toUpperCase();
                ctx.fillText(initial, sx + slotSize / 2, sy + slotSize / 2 - 3);

                // Level indicator — small dots at bottom
                const dotY = sy + slotSize - 5;
                const maxDots = Math.min(weapon.maxLevel, 8);
                const dotSpacing = Math.min(3, (slotSize - 4) / maxDots);
                const dotsStartX = sx + slotSize / 2 - (maxDots * dotSpacing) / 2;
                for (let d = 0; d < maxDots; d++) {
                    ctx.fillStyle = d < weapon.level ? weapon.color : 'rgba(255,255,255,0.15)';
                    ctx.beginPath();
                    ctx.arc(dotsStartX + d * dotSpacing + dotSpacing / 2, dotY, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Synergy indicator — small star
                if (hasSynergy) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = "8px 'JetBrains Mono', monospace";
                    ctx.fillText('★', sx + slotSize - 5, sy + 6);
                    ctx.font = "bold 9px 'JetBrains Mono', monospace";
                }
            } else {
                // Empty slot
                ctx.fillStyle = 'rgba(255,255,255,0.02)';
                ctx.fillRect(sx, sy, slotSize, slotSize);
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(sx, sy, slotSize, slotSize);
                ctx.setLineDash([]);
            }
        }

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

        // --- Shield indicator (below dodge) ---
        if (player.shieldMaxCharges > 0) {
            const shieldY = h - xpBarH - 44 - pad;
            for (let i = 0; i < player.shieldMaxCharges; i++) {
                const sx = w - pad - 58 + i * 20;
                const active = i < player.shieldCharges;
                ctx.fillStyle = active ? 'rgba(56,189,248,0.7)' : 'rgba(56,189,248,0.15)';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(sx + 8, shieldY + 8, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            if (player.shieldCharges < player.shieldMaxCharges) {
                const rechargeRatio = 1 - (player.shieldTimer / player.shieldRechargeTime);
                ctx.fillStyle = '#38bdf8';
                ctx.font = "8px 'JetBrains Mono', monospace";
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.ceil(player.shieldTimer)}s`, w - pad - 30, shieldY + 22);
            }
        }

        // --- Active synergies (left side, below level) ---
        if (player.synergies) {
            const SYNERGY_NAMES = {
                frozenLightning: { name: 'Frozen Storm', color: '#67e8f9' },
                voidNova: { name: 'Void Collapse', color: '#c084fc' },
                guidedBeam: { name: 'Guided Annihilation', color: '#f87171' },
                gravityFreeze: { name: 'Absolute Zero', color: '#7dd3fc' },
                acidStorm: { name: 'Acid Storm', color: '#86efac' },
                phantomArmy: { name: 'Phantom Army', color: '#a5b4fc' },
                eventHorizon: { name: 'Event Horizon', color: '#f0abfc' },
                sentinelGrid: { name: 'Sentinel Grid', color: '#6ee7b7' },
                bladeStorm: { name: 'Blade Storm', color: '#e9d5ff' },
                voidSiphon: { name: 'Void Siphon', color: '#fca5a5' },
                ironSkin: { name: 'Iron Skin', color: '#9ca3af' },
                bloodRush: { name: 'Blood Rush', color: '#dc2626' },
                overcharge: { name: 'Overcharge', color: '#facc15' },
                vortexMagnet: { name: 'Vortex Magnet', color: '#60a5fa' },
                juggernaut: { name: 'Juggernaut', color: '#f97316' }
            };
            let sy = hpY + 22;
            for (const [key, active] of Object.entries(player.synergies)) {
                if (!active) continue;
                const info = SYNERGY_NAMES[key];
                if (!info) continue;
                ctx.fillStyle = info.color;
                ctx.font = "bold 10px 'JetBrains Mono', monospace";
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(`★ ${info.name}`, hpX, sy);
                sy += 14;
            }
        }

        // --- Notifications (center screen, animated) ---
        for (let i = 0; i < this.notifications.length; i++) {
            const notif = this.notifications[i];
            const t = notif.life / notif.maxLife;
            const fadeIn = Math.min(1, notif.life / 0.3);
            const fadeOut = t > 0.7 ? 1 - ((t - 0.7) / 0.3) : 1;
            const alpha = fadeIn * fadeOut;
            const scale = 0.8 + fadeIn * 0.2;
            const yOff = h * 0.25 + i * 40;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(w / 2, yOff);
            ctx.scale(scale, scale);

            // Glow background
            ctx.fillStyle = `rgba(0,0,0,0.7)`;
            const metrics = ctx.measureText(notif.text);
            const textW = 300;
            ctx.fillRect(-textW / 2 - 10, -14, textW + 20, 28);

            // Gold border
            ctx.strokeStyle = notif.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-textW / 2 - 10, -14, textW + 20, 28);

            // Text
            ctx.fillStyle = notif.color;
            ctx.font = "bold 14px 'JetBrains Mono', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notif.text, 0, 0);

            ctx.restore();
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
