// upgrades.js — Upgrade definitions: weapon unlocks, evolutions, passives, synergies

export const PASSIVE_UPGRADES = {
    maxHp: {
        name: 'Vitality',
        description: '+20 Max HP',
        icon: 'heart',
        color: '#ef4444',
        maxLevel: 5,
        rarity: 'common',
        effect: (player, level) => { player.maxHp += 20; }
    },
    speed: {
        name: 'Swift Boots',
        description: '+12% Move Speed',
        icon: 'boot',
        color: '#22c55e',
        maxLevel: 5,
        rarity: 'common',
        effect: (player, level) => { player.speed *= 1.12; }
    },
    pickupRadius: {
        name: 'Magnetism',
        description: '+25% Pickup Radius',
        icon: 'magnet',
        color: '#3b82f6',
        maxLevel: 5,
        rarity: 'common',
        effect: (player, level) => { player.pickupRadius *= 1.25; }
    },
    damage: {
        name: 'Power',
        description: '+10% All Damage',
        icon: 'sword',
        color: '#f59e0b',
        maxLevel: 5,
        rarity: 'uncommon',
        effect: (player, level) => { player.damageBonus += 0.10; }
    },
    armor: {
        name: 'Plating',
        description: '+4 Armor (reduces all damage taken by 4)',
        icon: 'shield',
        color: '#6b7280',
        maxLevel: 5,
        rarity: 'uncommon',
        effect: (player, level) => { player.armor += 4; }
    },
    cooldown: {
        name: 'Haste',
        description: '-8% Cooldowns',
        icon: 'clock',
        color: '#a855f7',
        maxLevel: 5,
        rarity: 'rare',
        effect: (player, level) => { player.cooldownReduction += 0.08; }
    },
    regen: {
        name: 'Regeneration',
        description: '+0.5 HP/sec',
        icon: 'plus',
        color: '#22c55e',
        maxLevel: 3,
        rarity: 'rare',
        effect: (player, level) => { player.hpRegen += 0.5; }
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
    // --- Original synergies (improved descriptions) ---
    frozenLightning: {
        name: 'Frozen Storm',
        description: 'Lightning chains freeze enemies for 2s and deals +50% damage to frozen targets.',
        icon: 'storm',
        color: '#67e8f9',
        rarity: 'legendary',
        requires: ['frost', 'lightning'],
        effect: (player) => { player.synergies.frozenLightning = true; }
    },
    voidNova: {
        name: 'Void Collapse',
        description: 'Nova pulls enemies inward before detonating, doubling hit count. Orbitals spin 50% faster.',
        icon: 'vortex',
        color: '#c084fc',
        rarity: 'legendary',
        requires: ['nova', 'orbital'],
        effect: (player) => { player.synergies.voidNova = true; }
    },
    guidedBeam: {
        name: 'Guided Annihilation',
        description: 'Beam splits to hit 3 targets simultaneously. Missiles home 2x harder.',
        icon: 'split',
        color: '#f87171',
        rarity: 'legendary',
        requires: ['beam', 'missile'],
        effect: (player) => { player.synergies.guidedBeam = true; }
    },
    gravityFreeze: {
        name: 'Absolute Zero',
        description: 'Frozen enemies take 2x damage inside Gravity Wells. Wells last 50% longer.',
        icon: 'gravity',
        color: '#7dd3fc',
        rarity: 'legendary',
        requires: ['gravity', 'frost'],
        effect: (player) => { player.synergies.gravityFreeze = true; }
    },
    // --- New synergies for new weapons ---
    acidStorm: {
        name: 'Acid Storm',
        description: 'Void Rain pools electrify — enemies in pools take lightning strikes every 0.5s.',
        icon: 'storm',
        color: '#86efac',
        rarity: 'legendary',
        requires: ['voidRain', 'lightning'],
        effect: (player) => { player.synergies.acidStorm = true; }
    },
    phantomArmy: {
        name: 'Phantom Army',
        description: 'Temporal Echo spawns 2 additional ghosts. Shadow Swarm drones deal +80% damage.',
        icon: 'temporalEcho',
        color: '#a5b4fc',
        rarity: 'legendary',
        requires: ['temporalEcho', 'shadowSwarm'],
        effect: (player) => { player.synergies.phantomArmy = true; }
    },
    eventHorizon: {
        name: 'Event Horizon',
        description: 'Singularity Cannon absorbs enemy projectiles to grow faster. Gravity Wells feed into singularities.',
        icon: 'singularityCannon',
        color: '#f0abfc',
        rarity: 'legendary',
        requires: ['singularityCannon', 'gravity'],
        effect: (player) => { player.synergies.eventHorizon = true; }
    },
    sentinelGrid: {
        name: 'Sentinel Grid',
        description: 'Pulse Wards chain-zap between each other. Orbitals leave damage trails.',
        icon: 'pulseWard',
        color: '#6ee7b7',
        rarity: 'legendary',
        requires: ['pulseWard', 'orbital'],
        effect: (player) => { player.synergies.sentinelGrid = true; }
    },
    bladeStorm: {
        name: 'Blade Storm',
        description: 'Phantom Blade slashes send out projectile waves. Nova triggers blade slashes.',
        icon: 'phantomBlade',
        color: '#e9d5ff',
        rarity: 'legendary',
        requires: ['phantomBlade', 'nova'],
        effect: (player) => { player.synergies.bladeStorm = true; }
    },
    voidSiphon: {
        name: 'Void Siphon',
        description: 'Void Rift enemies drop 3x XP. Missile kills inside rifts restore 2 HP each.',
        icon: 'voidRift',
        color: '#fca5a5',
        rarity: 'legendary',
        requires: ['voidRift', 'missile'],
        effect: (player) => { player.synergies.voidSiphon = true; }
    },
    // --- Passive + Weapon hybrid synergies ---
    ironSkin: {
        name: 'Iron Skin',
        description: 'Armor also reflects 50% damage back to attackers. Grants +0.5 HP/sec regen.',
        icon: 'shield',
        color: '#9ca3af',
        rarity: 'legendary',
        requires: [],
        requiresPassive: ['armor', 'regen'],
        passiveMinLevel: 2,
        effect: (player) => { player.synergies.ironSkin = true; player.hpRegen += 0.5; }
    },
    bloodRush: {
        name: 'Blood Rush',
        description: 'Below 40% HP: +60% move speed, +40% damage, all cooldowns halved.',
        icon: 'heart',
        color: '#dc2626',
        rarity: 'legendary',
        requires: [],
        requiresPassive: ['maxHp', 'speed'],
        passiveMinLevel: 2,
        effect: (player) => { player.synergies.bloodRush = true; }
    },
    overcharge: {
        name: 'Overcharge',
        description: 'Crits deal 3x damage instead of 2x. Haste also boosts crit chance by 10%.',
        icon: 'crosshair',
        color: '#facc15',
        rarity: 'legendary',
        requires: [],
        requiresPassive: ['critChance', 'cooldown'],
        passiveMinLevel: 2,
        effect: (player) => { player.synergies.overcharge = true; player.critChance += 0.10; }
    },
    vortexMagnet: {
        name: 'Vortex Magnet',
        description: 'Pickup radius pulls enemies in slightly. XP orbs worth 50% more.',
        icon: 'magnet',
        color: '#60a5fa',
        rarity: 'legendary',
        requires: [],
        requiresPassive: ['pickupRadius', 'damage'],
        passiveMinLevel: 2,
        effect: (player) => { player.synergies.vortexMagnet = true; }
    },
    juggernaut: {
        name: 'Juggernaut',
        description: 'Armor + Vitality: Taking damage triggers a shockwave dealing 50 damage to nearby enemies.',
        icon: 'shield',
        color: '#f97316',
        rarity: 'legendary',
        requires: [],
        requiresPassive: ['armor', 'maxHp'],
        passiveMinLevel: 2,
        effect: (player) => { player.synergies.juggernaut = true; }
    }
};

export const RARITY_WEIGHTS = {
    common: 60,
    uncommon: 25,
    rare: 12,
    legendary: 6
};

export const RARITY_COLORS = {
    common: '#9ca3af',
    uncommon: '#22c55e',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b'
};
