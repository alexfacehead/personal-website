// canvas.js — Renderer, camera, viewport culling, screen shake

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.followSpeed = 5;
        this.lookAhead = 80;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Slow motion
        this.timeScale = 1;
        this.slowMoTimer = 0;
        this.slowMoTarget = 1;
    }

    follow(player, dt) {
        this.targetX = player.x + player.vx * (this.lookAhead / 200);
        this.targetY = player.y + player.vy * (this.lookAhead / 200);
        const t = 1 - Math.exp(-this.followSpeed * dt);
        this.x += (this.targetX - this.x) * t;
        this.y += (this.targetY - this.y) * t;
    }

    shake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeTimer = this.shakeDuration;
    }

    triggerSlowMo(scale, duration) {
        this.timeScale = scale;
        this.slowMoTarget = 1;
        this.slowMoTimer = duration;
    }

    update(dt) {
        // Screen shake decay
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = this.shakeTimer / this.shakeDuration;
            const intensity = this.shakeIntensity * progress;
            this.shakeOffsetX = (Math.random() * 2 - 1) * intensity;
            this.shakeOffsetY = (Math.random() * 2 - 1) * intensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
            this.shakeIntensity = 0;
        }

        // Slow motion
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            if (this.slowMoTimer <= 0) {
                this.timeScale = this.slowMoTarget;
            }
        }
    }

    getViewport(canvasWidth, canvasHeight) {
        const halfW = canvasWidth / 2;
        const halfH = canvasHeight / 2;
        return {
            left: this.x - halfW,
            top: this.y - halfH,
            right: this.x + halfW,
            bottom: this.y + halfH,
            width: canvasWidth,
            height: canvasHeight
        };
    }

    isVisible(x, y, margin, canvasWidth, canvasHeight) {
        const vp = this.getViewport(canvasWidth, canvasHeight);
        return x >= vp.left - margin && x <= vp.right + margin &&
               y >= vp.top - margin && y <= vp.bottom + margin;
    }

    worldToScreen(wx, wy, canvasWidth, canvasHeight) {
        return {
            x: wx - this.x + canvasWidth / 2 + this.shakeOffsetX,
            y: wy - this.y + canvasHeight / 2 + this.shakeOffsetY
        };
    }

    screenToWorld(sx, sy, canvasWidth, canvasHeight) {
        return {
            x: sx + this.x - canvasWidth / 2,
            y: sy + this.y - canvasHeight / 2
        };
    }
}

export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.camera = new Camera();
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = Math.floor(rect.width * this.dpr);
        this.height = Math.floor(rect.height * this.dpr);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.scale(this.dpr, this.dpr);
        // Logical size for game coordinates
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;
    }

    get w() { return this.logicalWidth; }
    get h() { return this.logicalHeight; }

    beginFrame() {
        this.ctx.save();
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        // Apply camera transform
        const offsetX = -this.camera.x + this.logicalWidth / 2 + this.camera.shakeOffsetX;
        const offsetY = -this.camera.y + this.logicalHeight / 2 + this.camera.shakeOffsetY;
        this.ctx.translate(offsetX, offsetY);
    }

    endFrame() {
        this.ctx.restore();
    }

    // Draw in screen space (for HUD, overlays)
    beginScreenSpace() {
        this.ctx.save();
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    endScreenSpace() {
        this.ctx.restore();
    }

    // Helper: check if a world-space entity is visible
    isVisible(x, y, margin = 64) {
        return this.camera.isVisible(x, y, margin, this.logicalWidth, this.logicalHeight);
    }

    // Drawing helpers
    fillCircle(x, y, r, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
    }

    strokeCircle(x, y, r, color, lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawGlowCircle(x, y, r, color, glowRadius = 10) {
        this.ctx.save();
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glowRadius;
        this.fillCircle(x, y, r, color);
        this.ctx.restore();
    }

    drawPolygon(x, y, radius, sides, rotation, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (Math.PI * 2 * i) / sides - Math.PI / 2;
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawGlowPolygon(x, y, radius, sides, rotation, color, glowRadius = 10) {
        this.ctx.save();
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glowRadius;
        this.drawPolygon(x, y, radius, sides, rotation, color);
        this.ctx.restore();
    }

    drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawGlowLine(x1, y1, x2, y2, color, lineWidth = 2, glowRadius = 8) {
        this.ctx.save();
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glowRadius;
        this.drawLine(x1, y1, x2, y2, color, lineWidth);
        this.ctx.restore();
    }

    drawBar(x, y, w, h, ratio, bgColor, fgColor, borderColor = null) {
        // Background
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x, y, w, h);
        // Fill
        this.ctx.fillStyle = fgColor;
        this.ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
        // Border
        if (borderColor) {
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, w, h);
        }
    }

    drawText(text, x, y, color = '#fff', font = '14px Inter', align = 'left', baseline = 'top') {
        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
    }
}
