// meta.js — Persistent meta-upgrades stored in localStorage

const STORAGE_KEY = 'void_survivors_meta';

// Escalating cost tiers: level 0->1 = base, then ramps hard
const COST_TIERS = [1, 10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
function escalatingCost(base) {
    return (level) => {
        const tier = COST_TIERS[Math.min(level, COST_TIERS.length - 1)];
        return Math.ceil(base * tier / COST_TIERS[0]);
    };
}

export const META_UPGRADES = {
    startHp: {
        name: 'Fortitude',
        description: '+10 Starting HP',
        icon: 'heart',
        color: '#ef4444',
        maxLevel: 10,
        cost: escalatingCost(1),
        apply: (player, level) => { player.maxHp += level * 10; player.hp = player.maxHp; }
    },
    startSpeed: {
        name: 'Agility',
        description: '+5% Move Speed',
        icon: 'boot',
        color: '#22c55e',
        maxLevel: 8,
        cost: escalatingCost(1),
        apply: (player, level) => { player.baseSpeed = 160 * (1 + level * 0.05); player.speed = player.baseSpeed; }
    },
    startDamage: {
        name: 'Might',
        description: '+5% All Damage',
        icon: 'sword',
        color: '#f59e0b',
        maxLevel: 8,
        cost: escalatingCost(1),
        apply: (player, level) => { player.damageBonus += level * 0.05; }
    },
    startArmor: {
        name: 'Toughness',
        description: '+2 Armor',
        icon: 'shield',
        color: '#6b7280',
        maxLevel: 5,
        cost: escalatingCost(2),
        apply: (player, level) => { player.armor += level * 2; }
    },
    startPickup: {
        name: 'Magnetism',
        description: '+15% Pickup Radius',
        icon: 'magnet',
        color: '#3b82f6',
        maxLevel: 5,
        cost: escalatingCost(1),
        apply: (player, level) => { player.pickupRadius *= (1 + level * 0.15); }
    },
    coinBonus: {
        name: 'Greed',
        description: '+20% Coin Drop Rate',
        icon: 'plus',
        color: '#fbbf24',
        maxLevel: 5,
        cost: escalatingCost(2),
        apply: () => {} // Applied in coin drop logic
    },
    startCooldown: {
        name: 'Haste',
        description: '-4% Cooldowns',
        icon: 'clock',
        color: '#a855f7',
        maxLevel: 8,
        cost: escalatingCost(2),
        apply: (player, level) => { player.cooldownReduction += level * 0.04; }
    },
    startCrit: {
        name: 'Keen Edge',
        description: '+3% Crit Chance',
        icon: 'crosshair',
        color: '#fbbf24',
        maxLevel: 8,
        cost: escalatingCost(2),
        apply: (player, level) => { player.critChance += level * 0.03; }
    },
    startRegen: {
        name: 'Vitality',
        description: '+0.1 HP/sec Regen',
        icon: 'plus',
        color: '#34d399',
        maxLevel: 6,
        cost: escalatingCost(1),
        apply: (player, level) => { player.hpRegen += level * 0.1; }
    },
    startXpBonus: {
        name: 'Wisdom',
        description: '+8% XP Gain',
        icon: 'magnet',
        color: '#818cf8',
        maxLevel: 8,
        cost: escalatingCost(1),
        apply: (player, level) => { player.xpMultiplier = 1 + level * 0.08; }
    },
    startDodge: {
        name: 'Evasion',
        description: '-0.5s Dodge Cooldown',
        icon: 'boot',
        color: '#c084fc',
        maxLevel: 4,
        cost: escalatingCost(3),
        apply: (player, level) => { player.dodgeCooldownMax = Math.max(0.5, player.dodgeCooldownMax - level * 0.5); }
    },
    startIFrames: {
        name: 'Ghost Phase',
        description: '+0.1s Invincibility after hit',
        icon: 'shield',
        color: '#94a3b8',
        maxLevel: 5,
        cost: escalatingCost(2),
        apply: (player, level) => { player.hitIFramesDuration += level * 0.1; }
    },
    startWeaponSlot: {
        name: 'Arsenal',
        description: '+1 Weapon Slot (max 8)',
        icon: 'sword',
        color: '#ef4444',
        maxLevel: 2,
        cost: escalatingCost(5),
        apply: () => {} // Applied in upgrade generation
    },
    startRevive: {
        name: 'Second Wind',
        description: 'Revive once per run with 30% HP',
        icon: 'heart',
        color: '#f43f5e',
        maxLevel: 1,
        cost: escalatingCost(10),
        apply: (player) => { player.revivesLeft = 1; }
    },
    // --- Prestige Tier ---
    startRevive2: {
        name: 'Undying',
        description: '+1 Extra Revive per run',
        icon: 'heart',
        color: '#be123c',
        maxLevel: 2,
        cost: escalatingCost(10),
        apply: (player, level) => { player.revivesLeft += level; }
    },
    startWeaponLevel: {
        name: 'Headstart',
        description: 'Starting weapon begins at Lv2',
        icon: 'sword',
        color: '#fb923c',
        maxLevel: 3,
        cost: escalatingCost(8),
        apply: () => {} // Applied in weapon init
    },
    startShield: {
        name: 'Void Shield',
        description: 'Block 1 hit every 15s (no damage taken)',
        icon: 'shield',
        color: '#38bdf8',
        maxLevel: 3,
        cost: escalatingCost(10),
        apply: (player, level) => {
            player.shieldCharges = level;
            player.shieldMaxCharges = level;
            player.shieldRechargeTime = 15;
            player.shieldTimer = 0;
        }
    },
    startLifesteal: {
        name: 'Siphon',
        description: '+0.01% Lifesteal on all damage dealt',
        icon: 'heart',
        color: '#4ade80',
        maxLevel: 5,
        cost: escalatingCost(5),
        apply: (player, level) => { player.lifesteal = level * 0.0001; }
    },
    startLuck: {
        name: 'Fortune',
        description: '+10% chance for better rarity upgrades',
        icon: 'plus',
        color: '#fbbf24',
        maxLevel: 5,
        cost: escalatingCost(5),
        apply: (player, level) => { player.luckBonus = level * 0.10; }
    },
    startAreaBonus: {
        name: 'Amplify',
        description: '+8% Weapon Area/Radius',
        icon: 'magnet',
        color: '#f472b6',
        maxLevel: 8,
        cost: escalatingCost(3),
        apply: (player, level) => { player.areaBonus = level * 0.08; }
    },
    startProjectiles: {
        name: 'Barrage',
        description: '+1 Projectile to all weapons',
        icon: 'crosshair',
        color: '#fb7185',
        maxLevel: 2,
        cost: escalatingCost(15),
        apply: (player, level) => { player.bonusProjectiles = level; }
    },
    startDuration: {
        name: 'Persistence',
        description: '+12% Weapon Duration',
        icon: 'clock',
        color: '#a78bfa',
        maxLevel: 5,
        cost: escalatingCost(3),
        apply: (player, level) => { player.durationBonus = level * 0.12; }
    },
    startDoubleXp: {
        name: 'Enlightenment',
        description: '5% chance for double XP from gems',
        icon: 'magnet',
        color: '#e879f9',
        maxLevel: 5,
        cost: escalatingCost(5),
        apply: (player, level) => { player.doubleXpChance = level * 0.05; }
    }
};

export class MetaSystem {
    constructor() {
        this.data = this._load();
    }

    _load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return { coins: 0, upgrades: {} };
    }

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) { /* ignore */ }
    }

    getCoins() {
        return this.data.coins;
    }

    addCoins(amount) {
        this.data.coins += amount;
        this._save();
    }

    getLevel(upgradeId) {
        return this.data.upgrades[upgradeId] || 0;
    }

    canBuy(upgradeId) {
        const def = META_UPGRADES[upgradeId];
        if (!def) return false;
        const level = this.getLevel(upgradeId);
        if (level >= def.maxLevel) return false;
        return this.data.coins >= def.cost(level);
    }

    buy(upgradeId) {
        const def = META_UPGRADES[upgradeId];
        if (!def) return false;
        const level = this.getLevel(upgradeId);
        if (level >= def.maxLevel) return false;
        const cost = def.cost(level);
        if (this.data.coins < cost) return false;

        this.data.coins -= cost;
        this.data.upgrades[upgradeId] = level + 1;
        this._save();
        return true;
    }

    prestige() {
        // Reset all upgrades, keep coins for now
        this.data.upgrades = {};
        this._save();
    }

    getCoinDropChance() {
        const greedLevel = this.getLevel('coinBonus');
        return 0.12 + greedLevel * 0.024; // 12% base, +2.4% per level
    }

    applyToPlayer(player) {
        for (const [id, def] of Object.entries(META_UPGRADES)) {
            const level = this.getLevel(id);
            if (level > 0 && def.apply) {
                def.apply(player, level);
            }
        }
    }

    reset() {
        this.data = { coins: 0, upgrades: {} };
        this._save();
    }
}
