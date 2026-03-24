// upgrades.js — Upgrade generation, selection, and application

import { WEAPON_DEFS } from '../data/weapons.js';
import { PASSIVE_UPGRADES, SYNERGY_UPGRADES, RARITY_WEIGHTS } from '../data/upgrades.js';

export class UpgradeSystem {
    constructor() {
        this.passiveLevels = {}; // upgradeId -> level
        this.appliedSynergies = new Set();
    }

    reset() {
        this.passiveLevels = {};
        this.appliedSynergies.clear();
    }

    generateChoices(player, weaponManager, count = 3) {
        const candidates = [];

        // 1. New weapon unlocks (if player has fewer than max weapons)
        const heldWeapons = weaponManager.getWeaponIds();
        const maxWeapons = player.maxWeapons || 6;
        if (heldWeapons.length < maxWeapons) {
            for (const [id, def] of Object.entries(WEAPON_DEFS)) {
                if (!weaponManager.hasWeapon(id)) {
                    // Rare/legendary weapons are 75% less likely to appear
                    const rarityMult = (def.rarity === 'rare' || def.rarity === 'legendary') ? 0.25 : 1.0;
                    candidates.push({
                        type: 'weapon_new',
                        id,
                        name: def.name,
                        description: def.description,
                        icon: def.icon,
                        color: def.color,
                        rarity: def.rarity,
                        weight: (RARITY_WEIGHTS[def.rarity] || 10) * rarityMult
                    });
                }
            }
        }

        // 2. Weapon upgrades for held weapons
        for (const id of heldWeapons) {
            const level = weaponManager.getLevel(id);
            const def = WEAPON_DEFS[id];
            if (level < def.maxLevel) {
                candidates.push({
                    type: 'weapon_upgrade',
                    id,
                    name: def.name,
                    description: `Level ${level + 1}: Enhanced ${def.name}`,
                    icon: def.icon,
                    color: def.color,
                    rarity: level >= 5 ? 'rare' : level >= 3 ? 'uncommon' : 'common',
                    weight: RARITY_WEIGHTS[level >= 5 ? 'rare' : level >= 3 ? 'uncommon' : 'common'],
                    level: level + 1
                });
            }
        }

        // 3. Passive upgrades
        for (const [id, def] of Object.entries(PASSIVE_UPGRADES)) {
            const currentLevel = this.passiveLevels[id] || 0;
            if (currentLevel < def.maxLevel) {
                candidates.push({
                    type: 'passive',
                    id,
                    name: def.name,
                    description: def.description,
                    icon: def.icon,
                    color: def.color,
                    rarity: def.rarity,
                    weight: RARITY_WEIGHTS[def.rarity] || 10,
                    level: currentLevel + 1
                });
            }
        }

        // 4. Synergy upgrades (check prerequisites)
        for (const [id, def] of Object.entries(SYNERGY_UPGRADES)) {
            if (this.appliedSynergies.has(id)) continue;
            const hasWeapons = (def.requires || []).every(wid => weaponManager.hasWeapon(wid));
            const hasPassives = (def.requiresPassive || []).every(pid => (this.passiveLevels[pid] || 0) >= (def.passiveMinLevel || 2));
            if (hasWeapons && hasPassives) {
                candidates.push({
                    type: 'synergy',
                    id,
                    name: def.name,
                    description: def.description,
                    icon: def.icon,
                    color: def.color,
                    rarity: 'legendary',
                    weight: RARITY_WEIGHTS.legendary * 3, // Boost synergy appearance
                    level: 1
                });
            }
        }

        if (candidates.length === 0) {
            // Fallback: offer max HP
            return [{
                type: 'passive', id: 'maxHp', name: 'Vitality',
                description: '+20 Max HP', icon: 'heart', color: '#ef4444',
                rarity: 'common', level: 99
            }];
        }

        // Guarantee a synergy slot if any synergies are available
        const synergyChoices = candidates.filter(c => c.type === 'synergy');
        if (synergyChoices.length > 0) {
            const guaranteed = synergyChoices[Math.floor(Math.random() * synergyChoices.length)];
            const others = this._weightedSample(
                candidates.filter(c => c !== guaranteed),
                count - 1
            );
            return this._shuffle([guaranteed, ...others]).slice(0, count);
        }

        // Guarantee at least one weapon unlock in early levels
        if (player.level <= 3 && heldWeapons.length < 2) {
            const weaponChoices = candidates.filter(c => c.type === 'weapon_new');
            if (weaponChoices.length > 0) {
                const guaranteed = weaponChoices[Math.floor(Math.random() * weaponChoices.length)];
                const others = this._weightedSample(
                    candidates.filter(c => c !== guaranteed),
                    count - 1
                );
                return this._shuffle([guaranteed, ...others]).slice(0, count);
            }
        }

        // Apply luck bonus — boost rare/legendary weights
        if (player.luckBonus > 0) {
            for (const c of candidates) {
                if (c.rarity === 'rare' || c.rarity === 'legendary') {
                    c.weight *= (1 + player.luckBonus);
                }
            }
        }

        return this._weightedSample(candidates, count);
    }

    applyChoice(choice, player, weaponManager) {
        switch (choice.type) {
            case 'weapon_new':
                weaponManager.addWeapon(choice.id);
                player.weapons = weaponManager.getWeaponIds();
                break;

            case 'weapon_upgrade':
                weaponManager.upgradeWeapon(choice.id);
                break;

            case 'passive':
                this.passiveLevels[choice.id] = (this.passiveLevels[choice.id] || 0) + 1;
                const passiveDef = PASSIVE_UPGRADES[choice.id];
                if (passiveDef?.effect) {
                    passiveDef.effect(player, this.passiveLevels[choice.id]);
                }
                break;

            case 'synergy':
                this.appliedSynergies.add(choice.id);
                const synergyDef = SYNERGY_UPGRADES[choice.id];
                if (synergyDef?.effect) {
                    synergyDef.effect(player);
                }
                break;
        }
    }

    _weightedSample(items, count) {
        if (items.length <= count) return [...items];

        const result = [];
        const remaining = [...items];

        for (let i = 0; i < count && remaining.length > 0; i++) {
            const totalWeight = remaining.reduce((sum, item) => sum + (item.weight || 1), 0);
            let roll = Math.random() * totalWeight;

            for (let j = 0; j < remaining.length; j++) {
                roll -= remaining[j].weight || 1;
                if (roll <= 0) {
                    result.push(remaining[j]);
                    remaining.splice(j, 1);
                    break;
                }
            }
        }

        return result;
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
