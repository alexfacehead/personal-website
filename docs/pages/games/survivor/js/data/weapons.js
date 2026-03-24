// weapons.js — Weapon stat definitions and per-level scaling

export const WEAPON_DEFS = {
    orbital: {
        name: 'Void Orbitals',
        description: 'Rotating shields that damage enemies on contact.',
        icon: 'orbital',
        color: '#a855f7',
        maxLevel: 8,
        rarity: 'common',
        base: {
            count: 2,
            damage: 8,
            radius: 60,
            speed: 2.5, // radians/sec
            orbSize: 8
        },
        perLevel: {
            1: { count: 2, damage: 8 },
            2: { damage: 12 },
            3: { count: 3 },
            4: { damage: 18, radius: 70 },
            5: { count: 4, speed: 3 },
            6: { damage: 25, orbSize: 10 },
            7: { count: 5, radius: 80 },
            8: { damage: 35, count: 6, speed: 3.5 }
        }
    },
    missile: {
        name: 'Magic Missile',
        description: 'Homing projectiles seek out enemies.',
        icon: 'missile',
        color: '#3b82f6',
        maxLevel: 8,
        rarity: 'common',
        base: {
            count: 1,
            damage: 15,
            cooldown: 1.2,
            speed: 280,
            homingStrength: 3,
            pierce: 0,
            projSize: 5
        },
        perLevel: {
            1: { count: 1, damage: 15 },
            2: { damage: 20 },
            3: { count: 2 },
            4: { damage: 28, cooldown: 1.0 },
            5: { count: 3, pierce: 1 },
            6: { damage: 35, speed: 320 },
            7: { count: 4, cooldown: 0.8 },
            8: { damage: 45, count: 5, homingStrength: 5 }
        }
    },
    nova: {
        name: 'Nova Burst',
        description: 'Periodic explosion around you.',
        icon: 'nova',
        color: '#f59e0b',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 20,
            cooldown: 3.0,
            radius: 100,
            knockback: 150
        },
        perLevel: {
            1: { damage: 20, radius: 100 },
            2: { damage: 30 },
            3: { radius: 130, cooldown: 2.5 },
            4: { damage: 45 },
            5: { radius: 160, knockback: 200 },
            6: { damage: 60, cooldown: 2.0 },
            7: { radius: 200 },
            8: { damage: 80, radius: 240, cooldown: 1.5 }
        }
    },
    lightning: {
        name: 'Chain Lightning',
        description: 'Bolts jump between nearby enemies.',
        icon: 'lightning',
        color: '#fbbf24',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 12,
            cooldown: 1.5,
            chains: 3,
            chainRange: 120,
            stunDuration: 0.2
        },
        perLevel: {
            1: { damage: 12, chains: 3 },
            2: { damage: 18 },
            3: { chains: 4, cooldown: 1.3 },
            4: { damage: 25, chainRange: 140 },
            5: { chains: 5 },
            6: { damage: 35, cooldown: 1.0 },
            7: { chains: 7, chainRange: 160 },
            8: { damage: 45, chains: 9, stunDuration: 0.4 }
        }
    },
    frost: {
        name: 'Frost Aura',
        description: 'Slows and damages nearby enemies.',
        icon: 'frost',
        color: '#22d3ee',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            damage: 5, // per second
            radius: 80,
            slowPercent: 0.3,
            freezeChance: 0.03
        },
        perLevel: {
            1: { damage: 5, radius: 80 },
            2: { slowPercent: 0.35, damage: 7 },
            3: { radius: 100 },
            4: { damage: 10, freezeChance: 0.05 },
            5: { radius: 120, slowPercent: 0.4 },
            6: { damage: 14, freezeChance: 0.08 },
            7: { radius: 150 },
            8: { damage: 20, slowPercent: 0.5, freezeChance: 0.12, radius: 180 }
        }
    },
    beam: {
        name: 'Death Beam',
        description: 'Continuous piercing beam toward nearest enemy.',
        icon: 'beam',
        color: '#ef4444',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            dps: 30,
            width: 4,
            range: 250
        },
        perLevel: {
            1: { dps: 30, range: 250 },
            2: { dps: 40 },
            3: { width: 6, range: 300 },
            4: { dps: 55 },
            5: { range: 350, width: 8 },
            6: { dps: 75 },
            7: { range: 400 },
            8: { dps: 100, width: 12, range: 450 }
        }
    }
};

export function getWeaponStats(weaponId, level) {
    const def = WEAPON_DEFS[weaponId];
    if (!def) return null;
    const stats = { ...def.base };
    for (let l = 1; l <= Math.min(level, def.maxLevel); l++) {
        const upgrades = def.perLevel[l];
        if (upgrades) Object.assign(stats, upgrades);
    }
    return stats;
}
