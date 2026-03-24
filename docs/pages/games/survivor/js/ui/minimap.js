// minimap.js — Corner minimap showing player and enemy density

export class Minimap {
    constructor(size = 140) {
        this.size = size;
        this.scale = 12; // 1 minimap pixel = scale world pixels
        this.padding = 12;
    }

    render(ctx, renderer, player, enemies) {
        const w = renderer.w;
        const h = renderer.h;
        const s = this.size;
        const mx = w - s - this.padding;
        const my = this.padding + 30; // below kill counter

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(mx, my, s, s);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, s, s);

        const centerX = mx + s / 2;
        const centerY = my + s / 2;

        // Enemies as dots
        enemies.forEachForward((enemy) => {
            const dx = (enemy.x - player.x) / this.scale;
            const dy = (enemy.y - player.y) / this.scale;

            // Skip if outside minimap
            if (Math.abs(dx) > s / 2 || Math.abs(dy) > s / 2) return;

            const dotX = centerX + dx;
            const dotY = centerY + dy;

            const dist = Math.sqrt(dx * dx + dy * dy);
            const alpha = Math.max(0.2, 1 - dist / (s / 2));

            if (enemy.isBoss) {
                // Boss: large pulsing dot
                const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(168,85,247,${pulse})`;
                ctx.beginPath();
                ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = `rgba(239,68,68,${alpha * 0.7})`;
                ctx.fillRect(dotX - 1, dotY - 1, 2, 2);
            }
        });

        // Player dot (center, bright)
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Viewport outline
        const vpHalfW = (renderer.w / 2) / this.scale;
        const vpHalfH = (renderer.h / 2) / this.scale;
        ctx.strokeStyle = 'rgba(168,85,247,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - vpHalfW, centerY - vpHalfH, vpHalfW * 2, vpHalfH * 2);
    }
}
