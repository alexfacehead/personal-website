// upgrades.test.js

import { UpgradeSystem } from '../js/systems/upgrades.js';
import { WeaponManager } from '../js/systems/weapons.js';
import { assert, assertEqual, assertTrue, assertGreater } from './runner.js';

export function registerTests(runner) {
    runner.describe('Upgrade System', () => {

        function mockPlayer(overrides = {}) {
            return {
                level: 1, weapons: [], damageBonus: 0, armor: 0,
                cooldownReduction: 0, hpRegen: 0, critChance: 0,
                critMultiplier: 2, maxHp: 100, hp: 100,
                speed: 160, pickupRadius: 50,
                synergies: {},
                ...overrides
            };
        }

        runner.it('should generate exactly count choices', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            const player = mockPlayer();
            const choices = us.generateChoices(player, wm, 3);
            assertEqual(choices.length, 3, 'Should have 3 choices');
        });

        runner.it('choices should be unique', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            const player = mockPlayer();
            const choices = us.generateChoices(player, wm, 3);
            const ids = choices.map(c => `${c.type}:${c.id}`);
            const unique = new Set(ids);
            assertEqual(unique.size, ids.length, 'All choices should be unique');
        });

        runner.it('should include weapon unlock option early game', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            wm.addWeapon('orbital');
            const player = mockPlayer({ level: 2, weapons: ['orbital'] });

            // Run multiple times to check guarantee
            let foundWeaponNew = false;
            for (let i = 0; i < 20; i++) {
                const choices = us.generateChoices(player, wm, 3);
                if (choices.some(c => c.type === 'weapon_new')) {
                    foundWeaponNew = true;
                    break;
                }
            }
            assertTrue(foundWeaponNew, 'Should offer weapon unlock in early levels');
        });

        runner.it('should not offer maxed-out passives', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            const player = mockPlayer();

            // Max out speed
            us.passiveLevels['speed'] = 5;

            const choices = us.generateChoices(player, wm, 3);
            const speedChoices = choices.filter(c => c.type === 'passive' && c.id === 'speed');
            assertEqual(speedChoices.length, 0, 'Should not offer maxed passive');
        });

        runner.it('should not offer maxed-out weapons', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            wm.addWeapon('orbital');
            // Upgrade to max
            for (let i = 0; i < 7; i++) wm.upgradeWeapon('orbital');

            const player = mockPlayer({ weapons: ['orbital'] });
            const choices = us.generateChoices(player, wm, 3);
            const orbUpgrades = choices.filter(c => c.type === 'weapon_upgrade' && c.id === 'orbital');
            assertEqual(orbUpgrades.length, 0, 'Should not offer max-level weapon upgrade');
        });

        runner.it('should offer synergy when prerequisites met', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            wm.addWeapon('frost');
            wm.addWeapon('lightning');
            const player = mockPlayer({ weapons: ['frost', 'lightning'] });

            // Try many times since it's weighted
            let foundSynergy = false;
            for (let i = 0; i < 50; i++) {
                const choices = us.generateChoices(player, wm, 3);
                if (choices.some(c => c.type === 'synergy' && c.id === 'frozenLightning')) {
                    foundSynergy = true;
                    break;
                }
            }
            assertTrue(foundSynergy, 'Should offer synergy when prereqs met');
        });

        runner.it('should not offer synergy without prerequisites', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            wm.addWeapon('orbital');
            const player = mockPlayer({ weapons: ['orbital'] });

            const choices = us.generateChoices(player, wm, 3);
            const synergies = choices.filter(c => c.type === 'synergy');
            assertEqual(synergies.length, 0, 'No synergies without prereqs');
        });

        runner.it('applying weapon_new should add weapon', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            const player = mockPlayer();

            us.applyChoice({ type: 'weapon_new', id: 'missile' }, player, wm);
            assertTrue(wm.hasWeapon('missile'), 'Should add missile weapon');
        });

        runner.it('applying passive should update player stats', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            const player = mockPlayer();

            us.applyChoice({ type: 'passive', id: 'damage' }, player, wm);
            assertGreater(player.damageBonus, 0, 'Damage bonus should increase');
        });

        runner.it('rarity distribution over many samples', () => {
            const us = new UpgradeSystem();
            const wm = new WeaponManager();
            const player = mockPlayer();
            const rarityCounts = { common: 0, uncommon: 0, rare: 0, legendary: 0 };

            for (let i = 0; i < 300; i++) {
                const choices = us.generateChoices(player, wm, 3);
                for (const c of choices) {
                    rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
                }
            }

            assertGreater(rarityCounts.common, rarityCounts.rare,
                'Common should appear more than rare');
        });
    });
}
