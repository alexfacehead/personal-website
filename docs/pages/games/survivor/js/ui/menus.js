// menus.js — HTML overlay management: title, level-up, pause, death

import { RARITY_COLORS } from '../data/upgrades.js';
import { META_UPGRADES } from '../systems/meta.js';

export class MenuSystem {
    constructor() {
        this.titleScreen = document.getElementById('title-screen');
        this.levelupScreen = document.getElementById('levelup-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.deathScreen = document.getElementById('death-screen');
        this.shopScreen = document.getElementById('shop-screen');
        this.levelupCards = document.getElementById('levelup-cards');
        this.deathStats = document.getElementById('death-stats');
        this.shopItems = document.getElementById('shop-items');
        this.titleCoins = document.getElementById('title-coins');
        this.shopCoins = document.getElementById('shop-coins');

        this._onChoice = null;
    }

    showTitle(metaSystem) {
        this._hideAll();
        this.titleScreen.classList.remove('hidden');
        if (metaSystem && this.titleCoins) {
            this.titleCoins.textContent = `Coins: ${metaSystem.getCoins()}`;
        }
    }

    showShop(metaSystem) {
        this._hideAll();
        this.shopScreen.classList.remove('hidden');
        this._renderShop(metaSystem);
    }

    _renderShop(metaSystem) {
        this.shopCoins.textContent = `Coins: ${metaSystem.getCoins()}`;
        this.shopItems.innerHTML = '';

        for (const [id, def] of Object.entries(META_UPGRADES)) {
            const level = metaSystem.getLevel(id);
            const maxed = level >= def.maxLevel;
            const cost = maxed ? 0 : def.cost(level);
            const canAfford = !maxed && metaSystem.getCoins() >= cost;

            const item = document.createElement('div');
            item.style.cssText = `display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.04); border: 1px solid ${maxed ? 'rgba(255,255,255,0.1)' : canAfford ? def.color + '66' : 'rgba(255,255,255,0.06)'}; border-radius: 8px; cursor: ${canAfford ? 'pointer' : 'default'}; opacity: ${maxed ? '0.5' : '1'}; transition: background 0.15s;`;

            const icon = this._getIcon(def.icon, def.color);
            const iconWrap = document.createElement('div');
            iconWrap.innerHTML = icon;
            iconWrap.style.cssText = 'flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;';
            iconWrap.querySelector('svg')?.setAttribute('width', '28');
            iconWrap.querySelector('svg')?.setAttribute('height', '28');

            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            info.innerHTML = `
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: ${def.color}; font-weight: 600;">${def.name} <span style="color: #888; font-weight: 400;">Lv${level}/${def.maxLevel}</span></div>
                <div style="font-size: 0.7rem; color: #888;">${def.description}</div>
            `;

            const costEl = document.createElement('div');
            costEl.style.cssText = `font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: ${maxed ? '#22c55e' : canAfford ? '#fbbf24' : '#666'}; white-space: nowrap; font-weight: 600;`;
            costEl.textContent = maxed ? 'MAX' : `${cost} coins`;

            item.appendChild(iconWrap);
            item.appendChild(info);
            item.appendChild(costEl);

            if (canAfford) {
                item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.08)'; });
                item.addEventListener('mouseleave', () => { item.style.background = 'rgba(255,255,255,0.04)'; });
                item.addEventListener('click', () => {
                    metaSystem.buy(id);
                    this._renderShop(metaSystem);
                });
            }

            this.shopItems.appendChild(item);
        }

        // Utility buttons row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem;';

        // Prestige button
        const prestigeBtn = document.createElement('button');
        prestigeBtn.textContent = 'PRESTIGE (Reset All)';
        prestigeBtn.style.cssText = 'flex: 1; padding: 0.6rem 1rem; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); border-radius: 8px; color: #ef4444; font-family: "JetBrains Mono", monospace; font-size: 0.7rem; cursor: pointer; letter-spacing: 0.05em; transition: background 0.15s;';
        prestigeBtn.addEventListener('mouseenter', () => { prestigeBtn.style.background = 'rgba(239,68,68,0.25)'; });
        prestigeBtn.addEventListener('mouseleave', () => { prestigeBtn.style.background = 'rgba(239,68,68,0.15)'; });
        prestigeBtn.addEventListener('click', () => {
            if (confirm('Reset all upgrades? (Prestige — no bonus yet)')) {
                metaSystem.prestige();
                this._renderShop(metaSystem);
            }
        });

        // Debug: Add coins button
        const addCoinsBtn = document.createElement('button');
        addCoinsBtn.textContent = '+2000 Coins (Debug)';
        addCoinsBtn.style.cssText = 'flex: 1; padding: 0.6rem 1rem; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; color: #fbbf24; font-family: "JetBrains Mono", monospace; font-size: 0.7rem; cursor: pointer; letter-spacing: 0.05em; transition: background 0.15s;';
        addCoinsBtn.addEventListener('mouseenter', () => { addCoinsBtn.style.background = 'rgba(251,191,36,0.2)'; });
        addCoinsBtn.addEventListener('mouseleave', () => { addCoinsBtn.style.background = 'rgba(251,191,36,0.1)'; });
        addCoinsBtn.addEventListener('click', () => {
            metaSystem.addCoins(2000);
            this._renderShop(metaSystem);
        });

        btnRow.appendChild(prestigeBtn);
        btnRow.appendChild(addCoinsBtn);
        this.shopItems.appendChild(btnRow);
    }

    hideTitle() {
        this.titleScreen.classList.add('hidden');
    }

    showLevelUp(choices, onChoice) {
        this._hideAll();
        this.levelupScreen.classList.remove('hidden');
        this._onChoice = onChoice;

        this.levelupCards.innerHTML = '';
        choices.forEach((choice, i) => {
            const card = document.createElement('div');
            card.className = `levelup-card rarity-${choice.rarity || 'common'}`;

            const icon = document.createElement('div');
            icon.className = 'levelup-card-icon';
            icon.innerHTML = this._getIcon(choice.icon, choice.color);

            const name = document.createElement('div');
            name.className = 'levelup-card-name';
            name.textContent = choice.name;

            const desc = document.createElement('div');
            desc.className = 'levelup-card-desc';
            desc.textContent = choice.description;

            const level = document.createElement('div');
            level.className = 'levelup-card-level';
            if (choice.type === 'weapon_upgrade') {
                level.textContent = `Level ${choice.level}`;
            } else if (choice.type === 'passive' && choice.level < 99) {
                level.textContent = `Level ${choice.level}`;
            } else if (choice.type === 'weapon_new') {
                level.textContent = 'NEW';
                level.style.color = '#22c55e';
            } else if (choice.type === 'synergy') {
                level.textContent = 'SYNERGY';
                level.style.color = '#fbbf24';
            }

            // Rarity badge
            const rarityBadge = document.createElement('div');
            rarityBadge.className = 'levelup-card-rarity';
            const rarityColors = { common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', legendary: '#f59e0b' };
            const rarityName = choice.rarity || 'common';
            rarityBadge.textContent = rarityName.toUpperCase();
            rarityBadge.style.color = rarityColors[rarityName] || '#9ca3af';
            rarityBadge.style.fontSize = '0.6rem';
            rarityBadge.style.fontFamily = 'var(--font-mono, monospace)';
            rarityBadge.style.letterSpacing = '0.1em';
            rarityBadge.style.marginTop = '4px';
            rarityBadge.style.opacity = '0.8';

            card.appendChild(icon);
            card.appendChild(name);
            card.appendChild(rarityBadge);
            card.appendChild(desc);
            card.appendChild(level);

            card.addEventListener('click', () => {
                if (this._onChoice) {
                    this._onChoice(choice);
                    this.hideLevelUp();
                }
            });

            this.levelupCards.appendChild(card);
        });
    }

    hideLevelUp() {
        this.levelupScreen.classList.add('hidden');
        this._onChoice = null;
    }

    showPause(weaponManager, player) {
        this.pauseScreen.classList.remove('hidden');
        this._pauseWeaponManager = weaponManager;
        this._pausePlayer = player;

        // Hide upgrades panel by default
        const panel = document.getElementById('pause-upgrades-panel');
        if (panel) panel.classList.add('hidden');

        // Wire up view upgrades button
        const viewBtn = document.getElementById('view-upgrades-btn');
        if (viewBtn && !viewBtn._bound) {
            viewBtn._bound = true;
            viewBtn.addEventListener('click', () => {
                const p = document.getElementById('pause-upgrades-panel');
                if (p.classList.contains('hidden')) {
                    p.classList.remove('hidden');
                    this._renderPauseUpgrades();
                    viewBtn.textContent = 'Hide Upgrades';
                } else {
                    p.classList.add('hidden');
                    viewBtn.textContent = 'View Upgrades';
                }
            });
        }
    }

    _renderPauseUpgrades() {
        const panel = document.getElementById('pause-upgrades-panel');
        if (!panel) return;
        panel.innerHTML = '';

        const wm = this._pauseWeaponManager;
        const player = this._pausePlayer;

        // Import weapon/passive data
        const { WEAPON_DEFS } = window._gameData || {};

        // Section: Current Weapons
        const weaponHeader = document.createElement('div');
        weaponHeader.style.cssText = 'font-family: "JetBrains Mono", monospace; font-size: 0.7rem; color: #888; letter-spacing: 0.1em; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);';
        weaponHeader.textContent = '// WEAPONS';
        panel.appendChild(weaponHeader);

        if (wm) {
            const weapons = wm.getWeaponList ? wm.getWeaponList() : [];
            const allWeaponIds = wm.getAllWeaponIds ? wm.getAllWeaponIds() : [];

            // Discovered weapons (ever seen in upgrade choices)
            const discovered = player?.discoveredWeapons || new Set();

            for (const wid of allWeaponIds) {
                const owned = weapons.find(w => w.id === wid);
                const isDiscovered = discovered.has(wid) || !!owned;

                const row = document.createElement('div');
                row.style.cssText = `display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; margin-bottom: 3px; border-radius: 6px; background: ${owned ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)'}; border: 1px solid ${owned ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)'};`;

                const iconEl = document.createElement('div');
                iconEl.style.cssText = 'flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;';

                const nameEl = document.createElement('div');
                nameEl.style.cssText = 'flex: 1; min-width: 0;';

                const levelEl = document.createElement('div');
                levelEl.style.cssText = 'font-family: "JetBrains Mono", monospace; font-size: 0.65rem; white-space: nowrap;';

                if (owned) {
                    const def = wm.getWeaponDef ? wm.getWeaponDef(wid) : null;
                    iconEl.innerHTML = this._getIcon(def?.icon || wid, def?.color || '#a855f7', 20);
                    nameEl.innerHTML = `<span style="font-size: 0.75rem; color: ${def?.color || '#a855f7'}; font-weight: 600;">${def?.name || wid}</span>`;
                    levelEl.innerHTML = `<span style="color: #a855f7;">Lv${owned.level}</span>`;
                } else if (isDiscovered) {
                    const def = wm.getWeaponDef ? wm.getWeaponDef(wid) : null;
                    iconEl.innerHTML = this._getIcon(def?.icon || wid, '#555', 20);
                    nameEl.innerHTML = `<span style="font-size: 0.75rem; color: #555;">${def?.name || wid}</span>`;
                    levelEl.innerHTML = `<span style="color: #444;">---</span>`;
                } else {
                    iconEl.innerHTML = `<span style="color: #333; font-size: 16px;">?</span>`;
                    nameEl.innerHTML = `<span style="font-size: 0.75rem; color: #333;">???</span>`;
                    levelEl.innerHTML = `<span style="color: #333;">???</span>`;
                }

                row.appendChild(iconEl);
                row.appendChild(nameEl);
                row.appendChild(levelEl);
                panel.appendChild(row);
            }
        }

        // Section: Passive Upgrades
        const passiveHeader = document.createElement('div');
        passiveHeader.style.cssText = 'font-family: "JetBrains Mono", monospace; font-size: 0.7rem; color: #888; letter-spacing: 0.1em; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);';
        passiveHeader.textContent = '// PASSIVES';
        panel.appendChild(passiveHeader);

        if (player && player.passives) {
            for (const [pid, level] of Object.entries(player.passives)) {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; margin-bottom: 3px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid rgba(34,197,94,0.15);';
                row.innerHTML = `
                    <span style="font-size: 0.75rem; color: #22c55e; font-weight: 600; flex: 1;">${pid}</span>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: #22c55e;">Lv${level}</span>
                `;
                panel.appendChild(row);
            }
        }

        // Section: Active Synergies
        if (player && player.synergies) {
            const activeSynergies = Object.entries(player.synergies).filter(([, v]) => v);
            if (activeSynergies.length > 0) {
                const synHeader = document.createElement('div');
                synHeader.style.cssText = 'font-family: "JetBrains Mono", monospace; font-size: 0.7rem; color: #888; letter-spacing: 0.1em; margin: 12px 0 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);';
                synHeader.textContent = '// SYNERGIES';
                panel.appendChild(synHeader);

                for (const [sid] of activeSynergies) {
                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; margin-bottom: 3px; border-radius: 6px; background: rgba(251,191,36,0.05); border: 1px solid rgba(251,191,36,0.15);';
                    row.innerHTML = `<span style="font-size: 0.75rem; color: #fbbf24; font-weight: 600;">★ ${sid}</span>`;
                    panel.appendChild(row);
                }
            }
        }
    }

    hidePause() {
        this.pauseScreen.classList.add('hidden');
    }

    showVictory(player, waveSystem, coinsEarned) {
        this._hideAll();
        const screen = document.getElementById('victory-screen');
        screen.classList.remove('hidden');

        const statsEl = document.getElementById('victory-stats');
        const activeSynergies = player.synergies ? Object.entries(player.synergies).filter(([,v]) => v).length : 0;
        const stats = [
            { label: 'Survival Time', value: '15:00' },
            { label: 'Level Reached', value: player.level },
            { label: 'Enemies Killed', value: player.kills.toLocaleString() },
            { label: 'Damage Dealt', value: Math.floor(player.damageDealt).toLocaleString() },
            { label: 'Coins Earned', value: coinsEarned || 0 },
            { label: 'Weapons Used', value: player.weapons.length },
            { label: 'Synergies Active', value: activeSynergies }
        ];

        statsEl.innerHTML = stats.map(s =>
            `<div class="death-stat"><span>${s.label}</span><span>${s.value}</span></div>`
        ).join('');
    }

    showDeath(player, waveSystem, coinsEarned) {
        this._hideAll();
        this.deathScreen.classList.remove('hidden');

        const stats = [
            { label: 'Survival Time', value: waveSystem.getTimerDisplay() },
            { label: 'Level Reached', value: player.level },
            { label: 'Enemies Killed', value: player.kills },
            { label: 'Damage Dealt', value: Math.floor(player.damageDealt).toLocaleString() },
            { label: 'Coins Earned', value: coinsEarned || 0 },
            { label: 'Weapons Used', value: player.weapons.length }
        ];

        this.deathStats.innerHTML = stats.map(s => `
            <div class="death-stat">
                <span class="death-stat-label">${s.label}</span>
                <span class="death-stat-value">${s.value}</span>
            </div>
        `).join('');
    }

    hideDeath() {
        this.deathScreen.classList.add('hidden');
    }

    _hideAll() {
        this.titleScreen.classList.add('hidden');
        this.levelupScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        this.deathScreen.classList.add('hidden');
        if (this.shopScreen) this.shopScreen.classList.add('hidden');
        const victoryScreen = document.getElementById('victory-screen');
        if (victoryScreen) victoryScreen.classList.add('hidden');
    }

    _getIcon(iconId, color) {
        const size = 48;
        const c = color || '#fff';
        const svgs = {
            orbital: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="12" fill="none" stroke="${c}" stroke-width="2"/><circle cx="24" cy="10" r="4" fill="${c}"/><circle cx="24" cy="38" r="4" fill="${c}"/></svg>`,
            missile: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><polygon points="24,8 32,40 24,34 16,40" fill="${c}"/></svg>`,
            nova: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4,4"/><circle cx="24" cy="24" r="6" fill="${c}"/></svg>`,
            lightning: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><polyline points="20,8 14,24 24,24 18,40" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            frost: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="24" y1="8" x2="24" y2="40" stroke="${c}" stroke-width="2"/><line x1="8" y1="24" x2="40" y2="24" stroke="${c}" stroke-width="2"/><line x1="12" y1="12" x2="36" y2="36" stroke="${c}" stroke-width="1.5"/><line x1="36" y1="12" x2="12" y2="36" stroke="${c}" stroke-width="1.5"/></svg>`,
            beam: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="8" y1="24" x2="40" y2="24" stroke="${c}" stroke-width="4"/><circle cx="40" cy="24" r="4" fill="${c}"/></svg>`,
            heart: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M24 38s-14-8-14-18c0-5 4-9 8-9 3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 4 8 9 0 10-14 18-14 18z" fill="${c}"/></svg>`,
            boot: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M16 12v18h-4v6h24v-6h-4V20l-6-2V12z" fill="${c}"/></svg>`,
            magnet: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M14 16v12c0 6 4 10 10 10s10-4 10-10V16h-6v12c0 2-2 4-4 4s-4-2-4-4V16z" fill="${c}"/></svg>`,
            sword: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="12" y1="36" x2="36" y2="12" stroke="${c}" stroke-width="3"/><line x1="28" y1="12" x2="36" y2="12" stroke="${c}" stroke-width="3"/><line x1="36" y1="12" x2="36" y2="20" stroke="${c}" stroke-width="3"/></svg>`,
            shield: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M24 8l-14 6v10c0 10 6 16 14 20 8-4 14-10 14-20V14z" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
            clock: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="none" stroke="${c}" stroke-width="2"/><line x1="24" y1="14" x2="24" y2="24" stroke="${c}" stroke-width="2"/><line x1="24" y1="24" x2="32" y2="28" stroke="${c}" stroke-width="2"/></svg>`,
            plus: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="24" y1="12" x2="24" y2="36" stroke="${c}" stroke-width="4"/><line x1="12" y1="24" x2="36" y2="24" stroke="${c}" stroke-width="4"/></svg>`,
            crosshair: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="10" fill="none" stroke="${c}" stroke-width="2"/><line x1="24" y1="8" x2="24" y2="16" stroke="${c}" stroke-width="2"/><line x1="24" y1="32" x2="24" y2="40" stroke="${c}" stroke-width="2"/><line x1="8" y1="24" x2="16" y2="24" stroke="${c}" stroke-width="2"/><line x1="32" y1="24" x2="40" y2="24" stroke="${c}" stroke-width="2"/></svg>`,
            storm: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3,3"/><polyline points="22,14 18,24 26,24 20,36" fill="none" stroke="${c}" stroke-width="2.5"/></svg>`,
            vortex: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="6" fill="${c}"/><circle cx="24" cy="24" r="12" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="4,4"/><circle cx="24" cy="24" r="18" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2,4"/></svg>`,
            split: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="8" y1="24" x2="24" y2="24" stroke="${c}" stroke-width="3"/><line x1="24" y1="24" x2="40" y2="14" stroke="${c}" stroke-width="2"/><line x1="24" y1="24" x2="40" y2="24" stroke="${c}" stroke-width="2"/><line x1="24" y1="24" x2="40" y2="34" stroke="${c}" stroke-width="2"/></svg>`,
            phantomBlade: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M10,38 L24,8 L28,12 L18,36 Z" fill="${c}" opacity="0.8"/><path d="M24,8 L38,20 L34,24 L28,12 Z" fill="${c}" opacity="0.6"/><line x1="16" y1="34" x2="22" y2="38" stroke="${c}" stroke-width="2.5"/></svg>`,
            voidRift: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="16" ry="8" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3,3"/><ellipse cx="24" cy="24" rx="10" ry="5" fill="${c}" opacity="0.3"/><line x1="24" y1="10" x2="24" y2="38" stroke="${c}" stroke-width="1" opacity="0.4"/><circle cx="24" cy="24" r="3" fill="${c}"/></svg>`,
            pulseWard: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><polygon points="24,8 36,16 36,32 24,40 12,32 12,16" fill="none" stroke="${c}" stroke-width="2"/><circle cx="24" cy="24" r="4" fill="${c}"/><circle cx="24" cy="24" r="10" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2,3" opacity="0.6"/></svg>`,
            shadowSwarm: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="16" cy="20" r="4" fill="${c}" opacity="0.7"/><circle cx="32" cy="18" r="3.5" fill="${c}" opacity="0.5"/><circle cx="24" cy="30" r="4" fill="${c}" opacity="0.8"/><circle cx="36" cy="30" r="3" fill="${c}" opacity="0.4"/><circle cx="12" cy="32" r="3" fill="${c}" opacity="0.6"/></svg>`,
            voidRain: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="14" y1="8" x2="10" y2="22" stroke="${c}" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="4" x2="20" y2="18" stroke="${c}" stroke-width="2" stroke-linecap="round"/><line x1="34" y1="10" x2="30" y2="24" stroke="${c}" stroke-width="2" stroke-linecap="round"/><ellipse cx="24" cy="36" rx="16" ry="6" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/></svg>`,
            temporalEcho: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="20" cy="24" r="10" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.3"/><circle cx="28" cy="24" r="10" fill="none" stroke="${c}" stroke-width="2" opacity="0.7"/><circle cx="28" cy="24" r="3" fill="${c}"/></svg>`,
            singularityCannon: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="10" fill="${c}" opacity="0.3"/><circle cx="24" cy="24" r="6" fill="${c}" opacity="0.6"/><circle cx="24" cy="24" r="2" fill="#fff"/><circle cx="24" cy="24" r="16" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="3,4" opacity="0.4"/></svg>`,
            ricochetShard: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M8,36 L20,24 L32,30 L40,12" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="24" r="3" fill="${c}" opacity="0.5"/><circle cx="32" cy="30" r="3" fill="${c}" opacity="0.5"/><polygon points="40,12 36,16 38,18" fill="${c}"/></svg>`,
            hexRing: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/><circle cx="24" cy="24" r="10" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="3,4" opacity="0.4"/><circle cx="24" cy="24" r="3" fill="${c}"/></svg>`,
            antimatterLance: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><rect x="10" y="22" width="30" height="4" rx="2" fill="${c}" opacity="0.8"/><rect x="10" y="23" width="30" height="2" fill="#fff" opacity="0.5"/><circle cx="8" cy="24" r="4" fill="${c}" opacity="0.4"/></svg>`,
            chainScythe: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><path d="M24,24 C24,12 36,8 40,16" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M24,24 C24,36 12,40 8,32" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><circle cx="24" cy="24" r="3" fill="${c}"/></svg>`,
            plasmaMortar: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="34" r="12" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.4"/><circle cx="24" cy="18" r="6" fill="${c}" opacity="0.7"/><line x1="24" y1="24" x2="24" y2="34" stroke="${c}" stroke-width="1" stroke-dasharray="2,2" opacity="0.4"/></svg>`,
            chronoTrap: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="none" stroke="${c}" stroke-width="2"/><line x1="24" y1="24" x2="24" y2="14" stroke="${c}" stroke-width="2" stroke-linecap="round"/><line x1="24" y1="24" x2="32" y2="24" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="24" r="2" fill="${c}"/></svg>`,
            gravity: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="5" fill="${c}"/><circle cx="24" cy="24" r="11" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3,5" opacity="0.7"/><circle cx="24" cy="24" r="17" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2,6" opacity="0.4"/><path d="M10,14 Q16,20 18,24" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.6"/><path d="M38,34 Q32,28 30,24" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.6"/><path d="M34,10 Q28,16 26,20" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.6"/><path d="M14,38 Q20,32 22,28" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.6"/></svg>`
        };
        return svgs[iconId] || `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="12" fill="${c}"/></svg>`;
    }
}
