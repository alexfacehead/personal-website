// menus.js — HTML overlay management: title, level-up, pause, death

import { RARITY_COLORS } from '../data/upgrades.js';

export class MenuSystem {
    constructor() {
        this.titleScreen = document.getElementById('title-screen');
        this.levelupScreen = document.getElementById('levelup-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.deathScreen = document.getElementById('death-screen');
        this.levelupCards = document.getElementById('levelup-cards');
        this.deathStats = document.getElementById('death-stats');

        this._onChoice = null;
    }

    showTitle() {
        this._hideAll();
        this.titleScreen.classList.remove('hidden');
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

            card.appendChild(icon);
            card.appendChild(name);
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

    showPause() {
        this.pauseScreen.classList.remove('hidden');
    }

    hidePause() {
        this.pauseScreen.classList.add('hidden');
    }

    showDeath(player, waveSystem) {
        this._hideAll();
        this.deathScreen.classList.remove('hidden');

        const stats = [
            { label: 'Survival Time', value: waveSystem.getTimerDisplay() },
            { label: 'Level Reached', value: player.level },
            { label: 'Enemies Killed', value: player.kills },
            { label: 'Damage Dealt', value: Math.floor(player.damageDealt).toLocaleString() },
            { label: 'XP Collected', value: player.gemsCollected },
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
            split: `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><line x1="8" y1="24" x2="24" y2="24" stroke="${c}" stroke-width="3"/><line x1="24" y1="24" x2="40" y2="14" stroke="${c}" stroke-width="2"/><line x1="24" y1="24" x2="40" y2="24" stroke="${c}" stroke-width="2"/><line x1="24" y1="24" x2="40" y2="34" stroke="${c}" stroke-width="2"/></svg>`
        };
        return svgs[iconId] || `<svg width="${size}" height="${size}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="12" fill="${c}"/></svg>`;
    }
}
