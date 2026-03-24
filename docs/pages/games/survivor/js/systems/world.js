// world.js — Infinite chunk-based terrain with seeded decorations

const CHUNK_SIZE = 512;
const VIEW_RANGE = 2; // chunks in each direction

// Simple seedable PRNG (mulberry32)
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function chunkSeed(cx, cy) {
    return cx * 374761393 + cy * 668265263 + 1234567;
}

export class World {
    constructor() {
        this.chunks = new Map();
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkY = null;
    }

    reset() {
        this.chunks.clear();
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkY = null;
    }

    update(playerX, playerY) {
        const pcx = Math.floor(playerX / CHUNK_SIZE);
        const pcy = Math.floor(playerY / CHUNK_SIZE);

        if (pcx === this.lastPlayerChunkX && pcy === this.lastPlayerChunkY) return;
        this.lastPlayerChunkX = pcx;
        this.lastPlayerChunkY = pcy;

        // Generate needed chunks
        for (let dx = -VIEW_RANGE; dx <= VIEW_RANGE; dx++) {
            for (let dy = -VIEW_RANGE; dy <= VIEW_RANGE; dy++) {
                const cx = pcx + dx;
                const cy = pcy + dy;
                const key = `${cx},${cy}`;
                if (!this.chunks.has(key)) {
                    this.chunks.set(key, this._generateChunk(cx, cy));
                }
            }
        }

        // Remove distant chunks
        for (const [key, chunk] of this.chunks) {
            if (Math.abs(chunk.cx - pcx) > VIEW_RANGE + 1 ||
                Math.abs(chunk.cy - pcy) > VIEW_RANGE + 1) {
                this.chunks.delete(key);
            }
        }
    }

    _generateChunk(cx, cy) {
        const rng = mulberry32(chunkSeed(cx, cy));
        const decorations = [];

        // Zone color based on distance from origin
        const distFromOrigin = Math.sqrt(cx * cx + cy * cy);
        const hue = (distFromOrigin * 30 + cx * 17 + cy * 13) % 360;

        // Generate decorations
        const decoCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < decoCount; i++) {
            const type = rng() < 0.4 ? 'crater' : rng() < 0.7 ? 'crystal' : 'debris';
            decorations.push({
                type,
                lx: rng() * CHUNK_SIZE, // local coordinates within chunk
                ly: rng() * CHUNK_SIZE,
                size: 3 + rng() * 8,
                rotation: rng() * Math.PI * 2,
                alpha: 0.03 + rng() * 0.05
            });
        }

        // Grid line positions (subtle markers)
        const gridLines = [];
        const gridSpacing = 128;
        const worldX = cx * CHUNK_SIZE;
        const worldY = cy * CHUNK_SIZE;
        for (let x = 0; x < CHUNK_SIZE; x += gridSpacing) {
            gridLines.push({ x1: worldX + x, y1: worldY, x2: worldX + x, y2: worldY + CHUNK_SIZE });
        }
        for (let y = 0; y < CHUNK_SIZE; y += gridSpacing) {
            gridLines.push({ x1: worldX, y1: worldY + y, x2: worldX + CHUNK_SIZE, y2: worldY + y });
        }

        return { cx, cy, decorations, gridLines, hue, worldX: cx * CHUNK_SIZE, worldY: cy * CHUNK_SIZE };
    }

    render(ctx, renderer) {
        for (const [, chunk] of this.chunks) {
            const wx = chunk.worldX;
            const wy = chunk.worldY;

            // Skip if not visible
            if (!renderer.isVisible(wx + CHUNK_SIZE / 2, wy + CHUNK_SIZE / 2, CHUNK_SIZE)) continue;

            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            ctx.lineWidth = 1;
            for (const line of chunk.gridLines) {
                ctx.beginPath();
                ctx.moveTo(line.x1, line.y1);
                ctx.lineTo(line.x2, line.y2);
                ctx.stroke();
            }

            // Decorations
            for (const deco of chunk.decorations) {
                const dx = wx + deco.lx;
                const dy = wy + deco.ly;

                if (!renderer.isVisible(dx, dy, deco.size + 20)) continue;

                ctx.globalAlpha = deco.alpha;

                switch (deco.type) {
                    case 'crater':
                        ctx.strokeStyle = `hsla(${chunk.hue}, 30%, 30%, 0.3)`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(dx, dy, deco.size, 0, Math.PI * 2);
                        ctx.stroke();
                        break;

                    case 'crystal':
                        ctx.fillStyle = `hsla(${chunk.hue}, 60%, 50%, 0.15)`;
                        renderer.drawPolygon(dx, dy, deco.size * 0.6, 4, deco.rotation, ctx.fillStyle);
                        break;

                    case 'debris':
                        ctx.fillStyle = 'rgba(255,255,255,0.03)';
                        ctx.fillRect(dx - deco.size / 2, dy - deco.size / 2, deco.size, deco.size * 0.5);
                        break;
                }
            }
            ctx.globalAlpha = 1;
        }
    }
}
