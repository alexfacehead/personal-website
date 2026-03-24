// waves.test.js

import { WaveSystem } from '../js/systems/waves.js';
import { assert, assertEqual, assertGreater, assertTrue } from './runner.js';

export function registerTests(runner) {
    runner.describe('Wave System', () => {

        runner.it('difficulty should increase with time', () => {
            const ws = new WaveSystem();
            const d1 = ws.getDifficulty(0);
            const d2 = ws.getDifficulty(60);
            const d3 = ws.getDifficulty(120);
            assertGreater(d2, d1, 'Difficulty at 60s > 0s');
            assertGreater(d3, d2, 'Difficulty at 120s > 60s');
        });

        runner.it('difficulty at time 0 should be 1', () => {
            const ws = new WaveSystem();
            assertEqual(ws.getDifficulty(0), 1);
        });

        runner.it('only swarmers available at start', () => {
            const ws = new WaveSystem();
            const types = ws.getAvailableEnemyTypes(0);
            assertEqual(types.length, 1);
            assertEqual(types[0], 'swarmer');
        });

        runner.it('crawlers unlock at 30s', () => {
            const ws = new WaveSystem();
            const types = ws.getAvailableEnemyTypes(30);
            assertTrue(types.includes('swarmer'));
            assertTrue(types.includes('crawler'));
            assertEqual(types.length, 2);
        });

        runner.it('all non-boss types available at 180s', () => {
            const ws = new WaveSystem();
            const types = ws.getAvailableEnemyTypes(180);
            assertEqual(types.length, 5);
            assertTrue(types.includes('swarmer'));
            assertTrue(types.includes('crawler'));
            assertTrue(types.includes('spitter'));
            assertTrue(types.includes('exploder'));
            assertTrue(types.includes('ghost'));
        });

        runner.it('boss should spawn at 5 minutes', () => {
            const ws = new WaveSystem();
            // Simulate time passing to just past 5 minutes
            ws.elapsed = 300.1;
            const spawns = ws.update(0.1, 0, 0, 800, 600, 0, 300);
            const bossSpawns = spawns.filter(s => s.type === 'boss');
            assertEqual(bossSpawns.length, 1, 'Should spawn one boss');
        });

        runner.it('boss should not spawn twice without dying', () => {
            const ws = new WaveSystem();
            ws.elapsed = 300;
            ws.update(0.1, 0, 0, 800, 600, 0, 300);
            ws.elapsed = 300.5;
            const spawns = ws.update(0.1, 0, 0, 800, 600, 0, 300);
            const bossSpawns = spawns.filter(s => s.type === 'boss');
            assertEqual(bossSpawns.length, 0, 'Should not spawn second boss while first alive');
        });

        runner.it('spawn position should be outside viewport', () => {
            const ws = new WaveSystem();
            const pos = ws.getSpawnPosition(0, 0, 800, 600);
            const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            assertGreater(dist, 400, 'Should spawn at least 400px from player');
        });

        runner.it('spawn rate should increase with difficulty', () => {
            const ws = new WaveSystem();
            const rate1 = ws.getSpawnRate(1);
            const rate2 = ws.getSpawnRate(3);
            assert(rate2 < rate1, 'Higher difficulty should have lower spawn interval (faster spawning)');
        });

        runner.it('should not exceed max enemies', () => {
            const ws = new WaveSystem();
            ws.elapsed = 60; // 1 minute in
            const maxEnemies = 5;
            const spawns = ws.update(1.0, 0, 0, 800, 600, maxEnemies, maxEnemies);
            assertEqual(spawns.length, 0, 'Should not spawn when at max');
        });

        runner.it('timer display should format correctly', () => {
            const ws = new WaveSystem();
            ws.elapsed = 65;
            assertEqual(ws.getTimerDisplay(), '1:05');
            ws.elapsed = 0;
            assertEqual(ws.getTimerDisplay(), '0:00');
            ws.elapsed = 599;
            assertEqual(ws.getTimerDisplay(), '9:59');
        });
    });
}
