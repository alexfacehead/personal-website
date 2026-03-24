// runner.js — Minimal browser test framework

export class TestRunner {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
        this.results = { passed: 0, failed: 0, errors: [] };
    }

    describe(name, fn) {
        this.currentSuite = { name, tests: [] };
        this.suites.push(this.currentSuite);
        fn();
        this.currentSuite = null;
    }

    it(name, fn) {
        this.currentSuite.tests.push({ name, fn });
    }

    async run() {
        this.results = { passed: 0, failed: 0, errors: [] };

        for (const suite of this.suites) {
            for (const test of suite.tests) {
                try {
                    await test.fn();
                    this.results.passed++;
                } catch (e) {
                    this.results.failed++;
                    this.results.errors.push({
                        suite: suite.name,
                        test: test.name,
                        error: e.message || String(e)
                    });
                }
            }
        }

        return this.results;
    }

    renderResults(container) {
        container.innerHTML = '';

        const summary = document.createElement('div');
        summary.className = `test-summary ${this.results.failed === 0 ? 'pass' : 'fail'}`;
        summary.textContent = `${this.results.passed} passed, ${this.results.failed} failed`;
        container.appendChild(summary);

        for (const suite of this.suites) {
            const suiteEl = document.createElement('div');
            suiteEl.className = 'test-suite';
            suiteEl.innerHTML = `<h3>${suite.name}</h3>`;

            for (const test of suite.tests) {
                const error = this.results.errors.find(
                    e => e.suite === suite.name && e.test === test.name
                );

                const testEl = document.createElement('div');
                testEl.className = `test-case ${error ? 'fail' : 'pass'}`;
                testEl.innerHTML = `
                    <span class="test-icon">${error ? '\u2717' : '\u2713'}</span>
                    <span class="test-name">${test.name}</span>
                    ${error ? `<div class="test-error">${error.error}</div>` : ''}
                `;
                suiteEl.appendChild(testEl);
            }

            container.appendChild(suiteEl);
        }
    }
}

// Assertions
export function assert(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

export function assertApprox(actual, expected, tolerance = 0.01, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(message || `Expected ~${expected}, got ${actual} (tolerance: ${tolerance})`);
    }
}

export function assertTrue(val, message) { assert(val === true, message || `Expected true, got ${val}`); }
export function assertFalse(val, message) { assert(val === false, message || `Expected false, got ${val}`); }
export function assertGreater(a, b, msg) { assert(a > b, msg || `Expected ${a} > ${b}`); }
export function assertLess(a, b, msg) { assert(a < b, msg || `Expected ${a} < ${b}`); }
