// combat.test.js

import { calculateDamage, circlesCollide } from '../js/systems/combat.js';
import { assert, assertEqual, assertTrue, assertFalse, assertGreater, assertApprox } from './runner.js';

export function registerTests(runner) {
    runner.describe('Combat System', () => {

        runner.it('base damage with no bonuses', () => {
            const result = calculateDamage(10, 0, 0, 2);
            assertEqual(result.damage, 10, 'Should deal base damage');
            assertFalse(result.isCrit, 'Should not crit with 0 crit chance');
        });

        runner.it('damage bonus should scale damage', () => {
            const result = calculateDamage(10, 0.5, 0, 2);
            assertEqual(result.damage, 15, '10 * 1.5 = 15');
        });

        runner.it('minimum damage should be 1', () => {
            const result = calculateDamage(0, 0, 0, 2);
            assertEqual(result.damage, 1, 'Min damage is 1');
        });

        runner.it('crit with 100% chance should always crit', () => {
            const result = calculateDamage(10, 0, 1.0, 3);
            assertTrue(result.isCrit, 'Should crit with 100% chance');
            assertEqual(result.damage, 30, '10 * 3 = 30 with crit');
        });

        runner.it('damage bonus + crit should stack', () => {
            const result = calculateDamage(10, 0.5, 1.0, 2);
            assertEqual(result.damage, 30, '10 * 1.5 * 2 = 30');
        });

        runner.it('crit distribution over many rolls', () => {
            let crits = 0;
            const trials = 1000;
            for (let i = 0; i < trials; i++) {
                const result = calculateDamage(10, 0, 0.3, 2);
                if (result.isCrit) crits++;
            }
            // Should be roughly 30% ± some variance
            assertGreater(crits, 200, 'Should have at least ~200 crits out of 1000');
            assert(crits < 450, `Should have fewer than 450 crits, got ${crits}`);
        });

        runner.it('circles should collide when overlapping', () => {
            assertTrue(circlesCollide(0, 0, 10, 5, 0, 10), 'Overlapping circles');
        });

        runner.it('circles should collide when touching', () => {
            assertTrue(circlesCollide(0, 0, 10, 20, 0, 10), 'Touching circles');
        });

        runner.it('circles should not collide when apart', () => {
            assertFalse(circlesCollide(0, 0, 10, 25, 0, 10), 'Separated circles');
        });

        runner.it('circles should collide at same position', () => {
            assertTrue(circlesCollide(5, 5, 10, 5, 5, 10), 'Same position circles');
        });

        runner.it('damage rounds down', () => {
            const result = calculateDamage(7, 0.1, 0, 2);
            // 7 * 1.1 = 7.7, floor = 7
            assertEqual(result.damage, 7, 'Should floor damage');
        });
    });
}
