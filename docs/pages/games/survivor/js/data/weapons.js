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
            damage: 12,
            radius: 68,
            speed: 2.4, // radians/sec
            orbSize: 14
        },
        perLevel: {
            1: { count: 2, damage: 12 },
            2: { damage: 18, radius: 79 },
            3: { count: 3, radius: 90 },
            4: { damage: 26, radius: 101, orbSize: 16 },
            5: { count: 4, speed: 2.85, radius: 113 },
            6: { damage: 35, orbSize: 18, radius: 124 },
            7: { count: 5, radius: 135, speed: 3.15 },
            8: { damage: 45, count: 7, speed: 3.6, radius: 150, orbSize: 20 }
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
    },
    gravity: {
        name: 'Gravity Well',
        description: 'Drop a singularity that pulls enemies in and crushes them.',
        icon: 'gravity',
        color: '#8b5cf6',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 10, // per tick
            cooldown: 4.0,
            radius: 90,
            pullForce: 180,
            duration: 3.0,
            count: 1
        },
        perLevel: {
            1: { damage: 10, radius: 90 },
            2: { damage: 14 },
            3: { radius: 110, cooldown: 3.5 },
            4: { damage: 20, pullForce: 220 },
            5: { count: 2, duration: 3.5 },
            6: { damage: 28, radius: 130 },
            7: { cooldown: 3.0, pullForce: 260 },
            8: { damage: 38, count: 3, radius: 150, duration: 4.0 }
        }
    },
    phantomBlade: {
        name: 'Phantom Blade',
        description: 'Spectral sword slashes a wide arc around you.',
        icon: 'phantomBlade',
        color: '#c084fc',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            damage: 35,
            cooldown: 1.8,
            arcAngle: 2.2, // radians (~126 degrees)
            range: 120,
            knockback: 120
        },
        perLevel: {
            1: { damage: 35, range: 120 },
            2: { damage: 45 },
            3: { arcAngle: 2.8, range: 140 },
            4: { damage: 58, cooldown: 1.5 },
            5: { range: 165, knockback: 160 },
            6: { damage: 75, arcAngle: 3.4 },
            7: { range: 190, cooldown: 1.2 },
            8: { damage: 95, arcAngle: 4.2, range: 220, knockback: 200 }
        }
    },
    voidRift: {
        name: 'Void Rift',
        description: 'Tears open a portal at enemy clusters that shreds everything inside.',
        icon: 'voidRift',
        color: '#e879f9',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            damage: 18, // per tick
            cooldown: 5.0,
            radius: 70,
            duration: 2.5,
            count: 1
        },
        perLevel: {
            1: { damage: 18, radius: 70 },
            2: { damage: 25 },
            3: { radius: 90, cooldown: 4.5 },
            4: { damage: 35 },
            5: { count: 2, duration: 3.0 },
            6: { damage: 48, radius: 110 },
            7: { cooldown: 3.5, duration: 3.5 },
            8: { damage: 65, count: 3, radius: 130 }
        }
    },
    pulseWard: {
        name: 'Pulse Ward',
        description: 'Places a ward that zaps enemies and deflects projectiles.',
        icon: 'pulseWard',
        color: '#34d399',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 15,
            cooldown: 6.0,
            zapRadius: 100,
            zapCooldown: 1.0,
            duration: 8.0,
            count: 1,
            deflectRadius: 60
        },
        perLevel: {
            1: { damage: 15, zapRadius: 100 },
            2: { damage: 20, zapCooldown: 0.9 },
            3: { zapRadius: 120, deflectRadius: 75 },
            4: { damage: 28 },
            5: { count: 2, cooldown: 5.5 },
            6: { damage: 38, zapRadius: 140, zapCooldown: 0.7 },
            7: { duration: 10.0, deflectRadius: 90 },
            8: { damage: 50, count: 3, zapRadius: 160, zapCooldown: 0.5 }
        }
    },
    shadowSwarm: {
        name: 'Shadow Swarm',
        description: 'Summons autonomous drones that hunt enemies.',
        icon: 'shadowSwarm',
        color: '#94a3b8',
        maxLevel: 8,
        rarity: 'common',
        base: {
            damage: 10,
            count: 2,
            droneSpeed: 220,
            droneLife: 4.0,
            cooldown: 3.5
        },
        perLevel: {
            1: { damage: 10, count: 2 },
            2: { damage: 14 },
            3: { count: 3, droneSpeed: 240 },
            4: { damage: 20, cooldown: 3.0 },
            5: { count: 4, droneLife: 5.0 },
            6: { damage: 28, droneSpeed: 270 },
            7: { count: 5, cooldown: 2.5 },
            8: { damage: 38, count: 7, droneSpeed: 300 }
        }
    },
    voidRain: {
        name: 'Void Rain',
        description: 'Drops damaging zones that leave slowing acid pools.',
        icon: 'voidRain',
        color: '#4ade80',
        maxLevel: 8,
        rarity: 'common',
        base: {
            damage: 12,
            cooldown: 3.0,
            count: 2,
            radius: 50,
            duration: 2.5,
            poolDuration: 5.0,
            poolSlow: 0.4
        },
        perLevel: {
            1: { damage: 12, count: 2 },
            2: { damage: 16, radius: 55 },
            3: { count: 3, poolDuration: 6.0 },
            4: { damage: 22, cooldown: 2.7 },
            5: { count: 4, radius: 60, poolSlow: 0.5, duration: 3.0 },
            6: { damage: 30, poolDuration: 7.0 },
            7: { count: 5, cooldown: 2.3, duration: 3.5 },
            8: { damage: 42, count: 6, radius: 70, poolSlow: 0.6, poolDuration: 8.0 }
        }
    },
    temporalEcho: {
        name: 'Temporal Echo',
        description: 'A ghost replays your past movements, damaging enemies it touches.',
        icon: 'temporalEcho',
        color: '#818cf8',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 8,
            tickRate: 0.25,
            delay: 2.0,
            echoDamageRadius: 30
        },
        perLevel: {
            1: { damage: 8 },
            2: { damage: 12, echoDamageRadius: 33 },
            3: { tickRate: 0.2 },
            4: { damage: 18, echoDamageRadius: 36 },
            5: { delay: 1.5, damage: 24 },
            6: { tickRate: 0.15, echoDamageRadius: 40 },
            7: { damage: 32 },
            8: { damage: 45, echoDamageRadius: 50, tickRate: 0.12 }
        }
    },
    singularityCannon: {
        name: 'Singularity Cannon',
        description: 'Fires a black hole that grows by absorbing enemies.',
        icon: 'singularityCannon',
        color: '#e879f9',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            damage: 20,
            cooldown: 8.0,
            speed: 60,
            baseRadius: 15,
            growthPerKill: 5,
            maxRadius: 80,
            duration: 6.0,
            pullStrength: 120
        },
        perLevel: {
            1: { damage: 20, baseRadius: 15 },
            2: { damage: 28, pullStrength: 140 },
            3: { cooldown: 7.0, duration: 7.0 },
            4: { damage: 38, growthPerKill: 6 },
            5: { maxRadius: 100, cooldown: 6.0 },
            6: { damage: 50, pullStrength: 170, baseRadius: 20 },
            7: { duration: 8.0, growthPerKill: 8 },
            8: { damage: 70, cooldown: 5.0, maxRadius: 120, pullStrength: 200 }
        }
    },
    ricochetShard: {
        name: 'Ricochet Shard',
        description: 'Fires a shard that bounces between enemies.',
        icon: 'ricochetShard',
        color: '#f472b6',
        maxLevel: 8,
        rarity: 'common',
        base: {
            damage: 14,
            cooldown: 1.8,
            count: 1,
            bounces: 3,
            bounceRange: 150,
            speed: 350
        },
        perLevel: {
            1: { damage: 14, count: 1 },
            2: { damage: 18, bounces: 4 },
            3: { count: 2, cooldown: 1.6 },
            4: { damage: 24, bounceRange: 170 },
            5: { bounces: 5, speed: 380 },
            6: { damage: 32, count: 3, cooldown: 1.4 },
            7: { bounces: 7, bounceRange: 200 },
            8: { damage: 42, count: 4, bounces: 9, cooldown: 1.2 }
        }
    },
    hexRing: {
        name: 'Hex Ring',
        description: 'A cursed ring that weakens enemies inside it.',
        icon: 'hexRing',
        color: '#a3e635',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 6,
            minRadius: 40,
            maxRadius: 120,
            pulseSpeed: 1.5,
            damageAmp: 0.20,
            slowAmount: 0.3,
            tickRate: 0.4
        },
        perLevel: {
            1: { damage: 6 },
            2: { damage: 9, maxRadius: 135 },
            3: { damageAmp: 0.25, slowAmount: 0.35 },
            4: { damage: 13, pulseSpeed: 1.7 },
            5: { maxRadius: 155, damageAmp: 0.30 },
            6: { damage: 18, tickRate: 0.3 },
            7: { slowAmount: 0.45, maxRadius: 175 },
            8: { damage: 25, damageAmp: 0.40, pulseSpeed: 2.0, maxRadius: 200 }
        }
    },
    antimatterLance: {
        name: 'Antimatter Lance',
        description: 'Charges up then fires a massive piercing beam.',
        icon: 'antimatterLance',
        color: '#facc15',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            damage: 60,
            cooldown: 5.0,
            chargeTime: 1.0,
            beamWidth: 20,
            beamLength: 600,
            beamDuration: 0.4,
            pierce: 999
        },
        perLevel: {
            1: { damage: 60 },
            2: { damage: 80, beamWidth: 24 },
            3: { cooldown: 4.5, beamLength: 700 },
            4: { damage: 110, beamDuration: 0.5 },
            5: { beamWidth: 30, cooldown: 4.0 },
            6: { damage: 150, beamLength: 800 },
            7: { chargeTime: 0.7, cooldown: 3.5 },
            8: { damage: 200, beamWidth: 40, beamLength: 1000, beamDuration: 0.6 }
        }
    },
    chainScythe: {
        name: 'Chain Scythe',
        description: 'Sweeping slash that chains to nearby enemies.',
        icon: 'chainScythe',
        color: '#fb923c',
        maxLevel: 8,
        rarity: 'common',
        base: {
            damage: 18,
            cooldown: 1.4,
            range: 90,
            arcAngle: 2.0,
            chains: 2,
            chainRange: 100,
            chainDecay: 0.6
        },
        perLevel: {
            1: { damage: 18 },
            2: { damage: 24, range: 95 },
            3: { chains: 3, cooldown: 1.3 },
            4: { damage: 32, chainRange: 115 },
            5: { arcAngle: 2.5, chains: 4 },
            6: { damage: 42, cooldown: 1.1, range: 105 },
            7: { chains: 5, chainDecay: 0.7 },
            8: { damage: 55, chains: 7, range: 120, cooldown: 0.9 }
        }
    },
    plasmaMortar: {
        name: 'Plasma Mortar',
        description: 'Lobs explosive shells with huge blast radius.',
        icon: 'plasmaMortar',
        color: '#f97316',
        maxLevel: 8,
        rarity: 'uncommon',
        base: {
            damage: 30,
            cooldown: 3.5,
            count: 1,
            blastRadius: 80,
            lobSpeed: 180,
            lobArc: 1.0
        },
        perLevel: {
            1: { damage: 30, count: 1 },
            2: { damage: 38, blastRadius: 90 },
            3: { count: 2, cooldown: 3.2 },
            4: { damage: 48, blastRadius: 100 },
            5: { count: 2, cooldown: 2.8, lobSpeed: 200 },
            6: { damage: 60, blastRadius: 115 },
            7: { count: 3, cooldown: 2.4 },
            8: { damage: 80, count: 4, blastRadius: 135, cooldown: 2.0 }
        }
    },
    chronoTrap: {
        name: 'Chrono Trap',
        description: 'Places time-freeze zones with escalating damage.',
        icon: 'chronoTrap',
        color: '#22d3ee',
        maxLevel: 8,
        rarity: 'rare',
        base: {
            damage: 5,
            cooldown: 7.0,
            count: 1,
            radius: 70,
            duration: 4.0,
            freezeDuration: 1.5,
            damageEscalation: 1.5
        },
        perLevel: {
            1: { damage: 5 },
            2: { damage: 8, radius: 78 },
            3: { duration: 4.5, freezeDuration: 1.8 },
            4: { damage: 12, cooldown: 6.0 },
            5: { count: 2, radius: 85, damageEscalation: 1.8 },
            6: { damage: 16, duration: 5.0, freezeDuration: 2.0 },
            7: { cooldown: 5.0, damageEscalation: 2.0 },
            8: { damage: 22, count: 3, radius: 100, duration: 6.0, freezeDuration: 2.5 }
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
