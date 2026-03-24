// pool.js — Object pooling with contiguous array and swap-remove for O(1) operations

export class Pool {
    /**
     * @param {Function} factory - Creates a new object: () => object
     * @param {Function} reset - Resets an object for reuse: (obj) => void
     * @param {number} initialSize - Pre-allocate this many objects
     */
    constructor(factory, reset, initialSize = 64) {
        this.factory = factory;
        this.reset = reset;
        this.items = [];
        this.activeCount = 0;

        // Pre-allocate
        for (let i = 0; i < initialSize; i++) {
            this.items.push(factory());
        }
    }

    acquire() {
        let obj;
        if (this.activeCount < this.items.length) {
            obj = this.items[this.activeCount];
        } else {
            // Pool exhausted — grow
            obj = this.factory();
            this.items.push(obj);
        }
        obj._poolIndex = this.activeCount;
        obj.alive = true;
        this.activeCount++;
        return obj;
    }

    release(obj) {
        if (!obj.alive) return;
        obj.alive = false;
        this.reset(obj);

        const idx = obj._poolIndex;
        const lastIdx = this.activeCount - 1;

        if (idx !== lastIdx) {
            // Swap with last active
            const last = this.items[lastIdx];
            this.items[idx] = last;
            this.items[lastIdx] = obj;
            last._poolIndex = idx;
            obj._poolIndex = lastIdx;
        }

        this.activeCount--;
    }

    /**
     * Iterate over all active items. Callback receives (item, index).
     * Safe to release items during iteration if iterating backwards.
     */
    forEach(callback) {
        for (let i = this.activeCount - 1; i >= 0; i--) {
            callback(this.items[i], i);
        }
    }

    /**
     * Iterate forward (for rendering order). Do NOT release during forward iteration.
     */
    forEachForward(callback) {
        for (let i = 0; i < this.activeCount; i++) {
            callback(this.items[i], i);
        }
    }

    releaseAll() {
        for (let i = this.activeCount - 1; i >= 0; i--) {
            this.items[i].alive = false;
            this.reset(this.items[i]);
        }
        this.activeCount = 0;
    }

    get count() {
        return this.activeCount;
    }

    get capacity() {
        return this.items.length;
    }
}
