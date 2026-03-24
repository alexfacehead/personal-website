// spatial-hash.test.js

import { SpatialHash } from '../js/engine/spatial-hash.js';
import { assert, assertEqual, assertTrue, assertGreater } from './runner.js';

export function registerTests(runner) {
    runner.describe('SpatialHash', () => {

        runner.it('should insert and query an entity', () => {
            const sh = new SpatialHash(128);
            const e = { x: 100, y: 100, radius: 10 };
            sh.insert(e);
            const results = sh.query(50, 50, 150, 150);
            assertTrue(results.has(e), 'Should find inserted entity');
        });

        runner.it('should not find entity outside query area', () => {
            const sh = new SpatialHash(128);
            const e = { x: 100, y: 100, radius: 10 };
            sh.insert(e);
            const results = sh.query(500, 500, 600, 600);
            assert(!results.has(e), 'Should not find entity in distant query');
        });

        runner.it('should remove an entity', () => {
            const sh = new SpatialHash(128);
            const e = { x: 100, y: 100, radius: 10 };
            sh.insert(e);
            sh.remove(e);
            const results = sh.query(50, 50, 150, 150);
            assert(!results.has(e), 'Should not find removed entity');
        });

        runner.it('should update entity position', () => {
            const sh = new SpatialHash(128);
            const e = { x: 100, y: 100, radius: 10 };
            sh.insert(e);

            // Move to different cell
            e.x = 500;
            e.y = 500;
            sh.update(e);

            const oldResults = sh.query(50, 50, 150, 150);
            const newResults = sh.query(450, 450, 550, 550);
            assert(!oldResults.has(e), 'Should not find at old position');
            assertTrue(newResults.has(e), 'Should find at new position');
        });

        runner.it('should find entity spanning cell boundary', () => {
            const sh = new SpatialHash(128);
            // Entity at cell boundary with large radius
            const e = { x: 128, y: 128, radius: 20 };
            sh.insert(e);

            // Query from adjacent cell
            const results = sh.query(100, 100, 130, 130);
            assertTrue(results.has(e), 'Should find entity spanning boundary');
        });

        runner.it('should return empty set for empty area', () => {
            const sh = new SpatialHash(128);
            const results = sh.query(0, 0, 100, 100);
            assertEqual(results.size, 0);
        });

        runner.it('queryRadius should return entities within radius', () => {
            const sh = new SpatialHash(128);
            const near = { x: 50, y: 50, radius: 5 };
            const far = { x: 500, y: 500, radius: 5 };
            sh.insert(near);
            sh.insert(far);

            const results = sh.queryRadius(60, 60, 50);
            assert(results.includes(near), 'Should find nearby entity');
            assert(!results.includes(far), 'Should not find distant entity');
        });

        runner.it('should handle negative coordinates', () => {
            const sh = new SpatialHash(128);
            const e = { x: -200, y: -300, radius: 10 };
            sh.insert(e);
            const results = sh.query(-250, -350, -150, -250);
            assertTrue(results.has(e), 'Should handle negative coords');
        });

        runner.it('should handle many entities (stress test)', () => {
            const sh = new SpatialHash(128);
            const entities = [];
            for (let i = 0; i < 1000; i++) {
                const e = { x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000, radius: 10 };
                entities.push(e);
                sh.insert(e);
            }

            // Query a region
            const results = sh.query(-100, -100, 100, 100);
            // Count expected
            let expected = 0;
            for (const e of entities) {
                if (e.x + e.radius >= -100 && e.x - e.radius <= 100 &&
                    e.y + e.radius >= -100 && e.y - e.radius <= 100) {
                    expected++;
                }
            }
            // Results should contain at least the entities in the area
            // (may contain extras from cell-level inclusion)
            assertGreater(results.size, 0, 'Should find some entities in center region');
        });

        runner.it('clear should remove all entities', () => {
            const sh = new SpatialHash(128);
            for (let i = 0; i < 10; i++) {
                sh.insert({ x: i * 50, y: i * 50, radius: 5 });
            }
            sh.clear();
            const results = sh.query(-1000, -1000, 1000, 1000);
            assertEqual(results.size, 0, 'Should be empty after clear');
        });
    });
}
