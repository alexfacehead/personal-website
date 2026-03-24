// spatial-hash.js — Grid-based spatial partitioning for O(1) broad-phase collision

export class SpatialHash {
    constructor(cellSize = 128) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.entityCells = new Map(); // entity -> Set<cellKey>
    }

    _key(cx, cy) {
        return cx * 73856093 ^ cy * 19349663; // integer hash, avoids string alloc
    }

    _getCellCoords(x, y) {
        return {
            cx: Math.floor(x / this.cellSize),
            cy: Math.floor(y / this.cellSize)
        };
    }

    insert(entity) {
        const keys = this._getCellKeys(entity);
        const keySet = new Set();

        for (const k of keys) {
            let cell = this.cells.get(k);
            if (!cell) {
                cell = new Set();
                this.cells.set(k, cell);
            }
            cell.add(entity);
            keySet.add(k);
        }

        this.entityCells.set(entity, keySet);
    }

    remove(entity) {
        const keys = this.entityCells.get(entity);
        if (!keys) return;

        for (const k of keys) {
            const cell = this.cells.get(k);
            if (cell) {
                cell.delete(entity);
                if (cell.size === 0) this.cells.delete(k);
            }
        }

        this.entityCells.delete(entity);
    }

    update(entity) {
        // Only re-insert if cell changed
        const oldKeys = this.entityCells.get(entity);
        const newKeys = this._getCellKeys(entity);

        if (oldKeys && this._sameKeys(oldKeys, newKeys)) return;

        this.remove(entity);
        this.insert(entity);
    }

    _sameKeys(oldSet, newArr) {
        if (oldSet.size !== newArr.length) return false;
        for (const k of newArr) {
            if (!oldSet.has(k)) return false;
        }
        return true;
    }

    _getCellKeys(entity) {
        const r = entity.radius || 0;
        const minC = this._getCellCoords(entity.x - r, entity.y - r);
        const maxC = this._getCellCoords(entity.x + r, entity.y + r);
        const keys = [];

        for (let cx = minC.cx; cx <= maxC.cx; cx++) {
            for (let cy = minC.cy; cy <= maxC.cy; cy++) {
                keys.push(this._key(cx, cy));
            }
        }

        return keys;
    }

    query(left, top, right, bottom) {
        const minC = this._getCellCoords(left, top);
        const maxC = this._getCellCoords(right, bottom);
        const result = new Set();

        for (let cx = minC.cx; cx <= maxC.cx; cx++) {
            for (let cy = minC.cy; cy <= maxC.cy; cy++) {
                const cell = this.cells.get(this._key(cx, cy));
                if (cell) {
                    for (const e of cell) result.add(e);
                }
            }
        }

        return result;
    }

    queryRadius(x, y, radius) {
        const candidates = this.query(x - radius, y - radius, x + radius, y + radius);
        const r2 = radius * radius;
        const result = [];

        for (const e of candidates) {
            const dx = e.x - x;
            const dy = e.y - y;
            if (dx * dx + dy * dy <= r2) {
                result.push(e);
            }
        }

        return result;
    }

    clear() {
        this.cells.clear();
        this.entityCells.clear();
    }
}
