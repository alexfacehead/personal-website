// world.js — Infinite chunk-based terrain with atmospheric decorations

const CHUNK_SIZE = 512;
const VIEW_RANGE = 2;

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
        this.time = 0;
    }

    reset() {
        this.chunks.clear();
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkY = null;
        this.time = 0;
    }

    update(playerX, playerY) {
        const pcx = Math.floor(playerX / CHUNK_SIZE);
        const pcy = Math.floor(playerY / CHUNK_SIZE);

        if (pcx === this.lastPlayerChunkX && pcy === this.lastPlayerChunkY) return;
        this.lastPlayerChunkX = pcx;
        this.lastPlayerChunkY = pcy;

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

        const distFromOrigin = Math.sqrt(cx * cx + cy * cy);
        const hue = (distFromOrigin * 30 + cx * 17 + cy * 13) % 360;

        // Nebula clouds — large soft areas of color
        const nebulaCount = 1 + Math.floor(rng() * 2);
        for (let i = 0; i < nebulaCount; i++) {
            decorations.push({
                type: 'nebula',
                lx: rng() * CHUNK_SIZE,
                ly: rng() * CHUNK_SIZE,
                size: 80 + rng() * 120,
                alpha: 0.015 + rng() * 0.02,
                hueShift: rng() * 60 - 30
            });
        }

        // Stars — tiny bright dots
        const starCount = 8 + Math.floor(rng() * 12);
        for (let i = 0; i < starCount; i++) {
            decorations.push({
                type: 'star',
                lx: rng() * CHUNK_SIZE,
                ly: rng() * CHUNK_SIZE,
                size: 0.5 + rng() * 1.5,
                alpha: 0.15 + rng() * 0.35,
                twinkleSpeed: 1 + rng() * 3,
                twinkleOffset: rng() * Math.PI * 2
            });
        }

        // Decorations
        const decoCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < decoCount; i++) {
            const roll = rng();
            const type = roll < 0.3 ? 'crater' : roll < 0.55 ? 'crystal' : roll < 0.75 ? 'runeCircle' : 'debris';
            decorations.push({
                type,
                lx: rng() * CHUNK_SIZE,
                ly: rng() * CHUNK_SIZE,
                size: 3 + rng() * 10,
                rotation: rng() * Math.PI * 2,
                alpha: 0.04 + rng() * 0.06,
                sides: 3 + Math.floor(rng() * 4)
            });
        }

        // Grid lines
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

        return { cx, cy, decorations, gridLines, hue, worldX, worldY };
    }

    render(ctx, renderer) {
        this.time = performance.now() * 0.001;

        for (const [, chunk] of this.chunks) {
            const wx = chunk.worldX;
            const wy = chunk.worldY;

            if (!renderer.isVisible(wx + CHUNK_SIZE / 2, wy + CHUNK_SIZE / 2, CHUNK_SIZE)) continue;

            // Grid lines — subtle but visible
            ctx.strokeStyle = `hsla(${chunk.hue}, 40%, 40%, 0.04)`;
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

                if (!renderer.isVisible(dx, dy, (deco.size || 10) + 40)) continue;

                switch (deco.type) {
                    case 'nebula': {
                        const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, deco.size);
                        const h = (chunk.hue + deco.hueShift) % 360;
                        grad.addColorStop(0, `hsla(${h}, 50%, 30%, ${deco.alpha})`);
                        grad.addColorStop(0.5, `hsla(${h}, 40%, 20%, ${deco.alpha * 0.5})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(dx, dy, deco.size, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    }

                    case 'star': {
                        const twinkle = 0.5 + Math.sin(this.time * deco.twinkleSpeed + deco.twinkleOffset) * 0.5;
                        ctx.globalAlpha = deco.alpha * twinkle;
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(dx, dy, deco.size, 0, Math.PI * 2);
                        ctx.fill();
                        // Subtle glow
                        if (deco.size > 1) {
                            ctx.globalAlpha = deco.alpha * twinkle * 0.3;
                            ctx.beginPath();
                            ctx.arc(dx, dy, deco.size * 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                        break;
                    }

                    case 'crater':
                        ctx.globalAlpha = deco.alpha;
                        ctx.strokeStyle = `hsla(${chunk.hue}, 30%, 35%, 0.4)`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(dx, dy, deco.size, 0, Math.PI * 2);
                        ctx.stroke();
                        // Inner shadow
                        ctx.fillStyle = `hsla(${chunk.hue}, 20%, 10%, 0.05)`;
                        ctx.beginPath();
                        ctx.arc(dx + 1, dy + 1, deco.size * 0.7, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                        break;

                    case 'crystal': {
                        ctx.globalAlpha = deco.alpha * 1.5;
                        const cHue = chunk.hue;
                        ctx.fillStyle = `hsla(${cHue}, 60%, 50%, 0.2)`;
                        ctx.strokeStyle = `hsla(${cHue}, 70%, 60%, 0.3)`;
                        ctx.lineWidth = 0.5;
                        ctx.save();
                        ctx.translate(dx, dy);
                        ctx.rotate(deco.rotation);
                        ctx.beginPath();
                        ctx.moveTo(0, -deco.size);
                        ctx.lineTo(deco.size * 0.4, 0);
                        ctx.lineTo(0, deco.size * 0.6);
                        ctx.lineTo(-deco.size * 0.4, 0);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.restore();
                        ctx.globalAlpha = 1;
                        break;
                    }

                    case 'runeCircle': {
                        const pulse = 0.5 + Math.sin(this.time * 0.5 + deco.rotation) * 0.3;
                        ctx.globalAlpha = deco.alpha * pulse;
                        ctx.strokeStyle = `hsla(${chunk.hue}, 50%, 50%, 0.2)`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.arc(dx, dy, deco.size * 1.5, 0, Math.PI * 2);
                        ctx.stroke();
                        // Inner polygon
                        const sides = deco.sides;
                        ctx.beginPath();
                        for (let s = 0; s <= sides; s++) {
                            const a = (Math.PI * 2 * s) / sides + deco.rotation + this.time * 0.1;
                            const px = dx + Math.cos(a) * deco.size;
                            const py = dy + Math.sin(a) * deco.size;
                            if (s === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                        break;
                    }

                    case 'debris':
                        ctx.globalAlpha = deco.alpha;
                        ctx.fillStyle = `hsla(${chunk.hue}, 15%, 25%, 0.06)`;
                        ctx.fillRect(dx - deco.size / 2, dy - deco.size / 2, deco.size, deco.size * 0.5);
                        ctx.globalAlpha = 1;
                        break;
                }
            }
        }
    }
}
