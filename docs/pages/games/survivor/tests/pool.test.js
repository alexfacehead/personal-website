// pool.test.js

import { Pool } from '../js/engine/pool.js';
import { assert, assertEqual, assertTrue } from './runner.js';

export function registerTests(runner) {
    runner.describe('Object Pool', () => {

        runner.it('should acquire and track active count', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => { o.value = 0; }, 4);
            assertEqual(pool.count, 0, 'Should start with 0 active');

            const a = pool.acquire();
            assertEqual(pool.count, 1, 'Should have 1 active after acquire');

            const b = pool.acquire();
            assertEqual(pool.count, 2, 'Should have 2 active');
        });

        runner.it('should release and decrement count', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => { o.value = 0; }, 4);
            const a = pool.acquire();
            const b = pool.acquire();
            pool.release(a);
            assertEqual(pool.count, 1, 'Should have 1 active after release');
        });

        runner.it('should reuse released objects', () => {
            const pool = new Pool(() => ({ id: Math.random() }), (o) => {}, 4);
            const a = pool.acquire();
            const aId = a.id;
            pool.release(a);

            const b = pool.acquire();
            // The reacquired object should be one from the pool (not necessarily the same one)
            assertEqual(pool.count, 1, 'Should reuse from pool');
        });

        runner.it('should grow when pool is exhausted', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => {}, 2);
            pool.acquire();
            pool.acquire();
            assertEqual(pool.capacity, 2, 'Should start with capacity 2');

            pool.acquire(); // This should grow the pool
            assertEqual(pool.count, 3);
            assertEqual(pool.capacity, 3, 'Should grow to 3');
        });

        runner.it('should reset object on release', () => {
            const pool = new Pool(
                () => ({ value: 0, name: '' }),
                (o) => { o.value = 0; o.name = ''; },
                4
            );

            const a = pool.acquire();
            a.value = 42;
            a.name = 'test';
            pool.release(a);

            assertEqual(a.value, 0, 'Should reset value');
            assertEqual(a.name, '', 'Should reset name');
        });

        runner.it('should not double-release', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => { o.value = 0; }, 4);
            const a = pool.acquire();
            pool.release(a);
            pool.release(a); // Should be no-op
            assertEqual(pool.count, 0, 'Should still be 0 after double release');
        });

        runner.it('forEach should iterate active items (reverse)', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => { o.value = 0; }, 4);
            pool.acquire().value = 1;
            pool.acquire().value = 2;
            pool.acquire().value = 3;

            const values = [];
            pool.forEach((item) => values.push(item.value));
            assertEqual(values.length, 3, 'Should iterate 3 items');
            assert(values.includes(1) && values.includes(2) && values.includes(3), 'Should have all values');
        });

        runner.it('should safely release during forEach', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => { o.value = 0; }, 4);
            pool.acquire().value = 1;
            pool.acquire().value = 2;
            pool.acquire().value = 3;

            // Release items with value > 1 during iteration
            pool.forEach((item) => {
                if (item.value > 1) pool.release(item);
            });

            assertEqual(pool.count, 1, 'Should have 1 remaining');
        });

        runner.it('releaseAll should clear everything', () => {
            const pool = new Pool(() => ({ value: 0 }), (o) => { o.value = 0; }, 4);
            pool.acquire();
            pool.acquire();
            pool.acquire();
            pool.releaseAll();
            assertEqual(pool.count, 0, 'Should be empty after releaseAll');
        });
    });
}
