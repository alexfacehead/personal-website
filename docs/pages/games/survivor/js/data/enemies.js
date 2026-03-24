// enemies.js — Enemy type stat definitions

export const ENEMY_TYPES = {
    swarmer: {
        name: 'Swarmer',
        hp: 10, speed: 110, damage: 17, xp: 1,
        color: '#ef4444', glowColor: 'rgba(239,68,68,0.5)',
        shape: 'triangle', sides: 3, size: 8,
        knockbackResist: 0.2,
        behavior: 'seek'
    },
    crawler: {
        name: 'Crawler',
        hp: 45, speed: 47, damage: 30, xp: 3,
        color: '#f97316', glowColor: 'rgba(249,115,22,0.5)',
        shape: 'hexagon', sides: 6, size: 14,
        knockbackResist: 0.7,
        behavior: 'seek'
    },
    spitter: {
        name: 'Spitter',
        hp: 20, speed: 60, damage: 11, xp: 4,
        color: '#eab308', glowColor: 'rgba(234,179,8,0.5)',
        shape: 'diamond', sides: 4, size: 10,
        knockbackResist: 0.3,
        behavior: 'ranged',
        projectileSpeed: 160,
        projectileDamage: 17,
        fireRate: 2.5, // seconds between shots
        preferredDist: 250
    },
    exploder: {
        name: 'Exploder',
        hp: 15, speed: 94, damage: 21, xp: 3,
        color: '#ec4899', glowColor: 'rgba(236,72,153,0.5)',
        shape: 'circle', sides: 0, size: 10,
        knockbackResist: 0.1,
        behavior: 'seek',
        explodeRadius: 80,
        explodeDamage: 53,
        explodeDelay: 0.4
    },
    ghost: {
        name: 'Ghost',
        hp: 25, speed: 77, damage: 26, xp: 5,
        color: '#22d3ee', glowColor: 'rgba(34,211,238,0.4)',
        shape: 'pentagon', sides: 5, size: 11,
        knockbackResist: 0.9,
        behavior: 'sine',
        sineAmplitude: 60,
        sineFrequency: 3,
        noCollideEnemies: true
    },
    boss: {
        name: 'Void Titan',
        hp: 800, speed: 34, damage: 42, xp: 100,
        color: '#a855f7', glowColor: 'rgba(168,85,247,0.6)',
        shape: 'hexagon', sides: 6, size: 30,
        knockbackResist: 1.0,
        behavior: 'boss',
        isBoss: true,
        phases: [
            { name: 'chase', hpThreshold: 1.0 },
            { name: 'summon', hpThreshold: 0.75 },
            { name: 'dash', hpThreshold: 0.5 },
            { name: 'fury', hpThreshold: 0.25 }
        ]
    },
    rainbowWatcher: {
        name: 'Rainbow Watcher',
        hp: 2500, speed: 55, damage: 35, xp: 500,
        color: '#fff', glowColor: 'rgba(255,255,255,0.8)',
        shape: 'eye', sides: 12, size: 40,
        knockbackResist: 1.0,
        behavior: 'rainbowWatcher',
        isBoss: true,
        isRainbowWatcher: true,
        phases: [
            { name: 'orbit',    hpThreshold: 1.0 },
            { name: 'blink',    hpThreshold: 0.7 },
            { name: 'barrage',  hpThreshold: 0.4 },
            { name: 'deathgaze', hpThreshold: 0.15 }
        ]
    }
};

// Difficulty-based HP/damage scaling
export function scaleEnemy(baseStats, difficulty) {
    return {
        hp: Math.floor(baseStats.hp * (1 + (difficulty - 1) * 0.4)),
        damage: Math.floor(baseStats.damage * (1 + (difficulty - 1) * 0.15)),
        speed: baseStats.speed * (1 + (difficulty - 1) * 0.05),
        xp: Math.ceil(baseStats.xp * (1 + (difficulty - 1) * 0.1))
    };
}
