// upgrades.js — Upgrade definitions: weapon unlocks, evolutions, passives, synergies

export const PASSIVE_UPGRADES = {
    maxHp: {
        name: 'Vitality',
        description: '+20 Max HP',
        icon: 'heart',
        color: '#ef4444',
        maxLevel: 5,
        rarity: 'common',
        effect: (player, level) => { player.maxHp = 100 + level * 20; player.hp = Math.min(player.hp, player.maxHp); }
    },
    speed: {
        name: 'Swift Boots',
        description: '+12% Move Speed',
        icon: 'boot',
        color: '#22c55e',
        maxLevel: 5,
        rarity: 'common',
        effect: (player, level) => { player.speed = 160 * (1 + level * 0.12); }
    },
    pickupRadius: {
        name: 'Magnetism',
        description: '+25% Pickup Radius',
        icon: 'magnet',
        color: '#3b82f6',
        maxLevel: 5,
        rarity: 'common',
        effect: (player, level) => { player.pickupRadius = 50 * (1 + level * 0.25); }
    },
    damage: {
        name: 'Power',
        description: '+10% All Damage',
        icon: 'sword',
        color: '#f59e0b',
        maxLevel: 5,
        rarity: 'uncommon',
        effect: (player, level) => { player.damageBonus = level * 0.10; }
    },
    armor: {
        name: 'Plating',
        description: '+3 Armor',
        icon: 'shield',
        color: '#6b7280',
        maxLevel: 5,
        rarity: 'uncommon',
        effect: (player, level) => { player.armor = level * 3; }
    },
    cooldown: {
        name: 'Haste',
        description: '-8% Cooldowns',
        icon: 'clock',
        color: '#a855f7',
        maxLevel: 5,
        rarity: 'rare',
        effect: (player, level) => { player.cooldownReduction = level * 0.08; }
    },
    regen: {
        name: 'Regeneration',
        description: '+1 HP/sec',
        icon: 'plus',
        color: '#22c55e',
        maxLevel: 3,
        rarity: 'rare',
        effect: (player, level) => { player.hpRegen = level * 1; }
    },
    critChance: {
        name: 'Precision',
        description: '+5% Crit Chance',
        icon: 'crosshair',
        color: '#fbbf24',
        maxLevel: 5,
        rarity: 'uncommon',
        effect: (player, level) => { player.critChance = level * 0.05; }
    }
};

export const SYNERGY_UPGRADES = {
    frozenLightning: {
        name: 'Frozen Storm',
        description: 'Lightning chains freeze enemies. Requires Frost Aura + Chain Lightning.',
        icon: 'storm',
        color: '#67e8f9',
        rarity: 'legendary',
        requires: ['frost', 'lightning'],
        effect: (player) => { player.synergies.frozenLightning = true; }
    },
    voidNova: {
        name: 'Void Collapse',
        description: 'Nova pulls enemies inward first. Requires Nova + Orbitals.',
        icon: 'vortex',
        color: '#c084fc',
        rarity: 'legendary',
        requires: ['nova', 'orbital'],
        effect: (player) => { player.synergies.voidNova = true; }
    },
    guidedBeam: {
        name: 'Guided Annihilation',
        description: 'Beam splits to hit 3 targets. Requires Death Beam + Magic Missile.',
        icon: 'split',
        color: '#f87171',
        rarity: 'legendary',
        requires: ['beam', 'missile'],
        effect: (player) => { player.synergies.guidedBeam = true; }
    }
};

export const RARITY_WEIGHTS = {
    common: 60,
    uncommon: 25,
    rare: 12,
    legendary: 3
};

export const RARITY_COLORS = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b'
};
