// input.js — Keyboard, touch (virtual joystick), and gamepad input

export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.justPressed = {};
        this._prevKeys = {};
        this._keyDownQueue = new Set(); // Buffered presses that survive quick release

        // Touch joystick state
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        this.touchDodge = false;
        this._touchJoystickId = null;
        this._touchDodgeId = null;

        // Gamepad
        this.gamepadIndex = -1;

        // DOM joystick elements
        this._joystickEl = document.getElementById('touch-joystick');
        this._joystickKnob = document.getElementById('touch-joystick-knob');
        this._dodgeBtn = document.getElementById('touch-dodge-btn');

        this._bindKeyboard();
        this._bindTouch();
    }

    _bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }
            const k = e.key.toLowerCase();
            this.keys[k] = true;
            this._keyDownQueue.add(k); // Buffer so quick press+release isn't lost
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Prevent keys sticking when window loses focus
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    _bindTouch() {
        const c = this.canvas;
        const maxKnobDist = 40; // Max pixel offset for joystick knob

        c.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = c.getBoundingClientRect();

            for (const touch of e.changedTouches) {
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                if (x < rect.width / 2) {
                    // Left half = joystick
                    this._touchJoystickId = touch.identifier;
                    this.touchActive = true;
                    this.touchStartX = x;
                    this.touchStartY = y;
                    this.touchCurrentX = x;
                    this.touchCurrentY = y;
                    // Show joystick at touch position
                    if (this._joystickEl) {
                        this._joystickEl.style.left = (x - 60) + 'px';
                        this._joystickEl.style.top = (y - 60) + 'px';
                        this._joystickEl.style.bottom = 'auto';
                        this._joystickEl.style.display = 'flex';
                        this._joystickEl.style.opacity = '1';
                    }
                    this._updateKnob(0, 0);
                } else {
                    // Right half = dodge
                    this._touchDodgeId = touch.identifier;
                    this.touchDodge = true;
                }
            }
        }, { passive: false });

        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._touchJoystickId) {
                    const rect = c.getBoundingClientRect();
                    this.touchCurrentX = touch.clientX - rect.left;
                    this.touchCurrentY = touch.clientY - rect.top;
                    // Move knob
                    let dx = this.touchCurrentX - this.touchStartX;
                    let dy = this.touchCurrentY - this.touchStartY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxKnobDist) {
                        dx = (dx / dist) * maxKnobDist;
                        dy = (dy / dist) * maxKnobDist;
                    }
                    this._updateKnob(dx, dy);
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._touchJoystickId) {
                    this.touchActive = false;
                    this._touchJoystickId = null;
                    this._updateKnob(0, 0);
                    if (this._joystickEl) {
                        this._joystickEl.style.opacity = '0.5';
                    }
                }
                if (touch.identifier === this._touchDodgeId) {
                    this._touchDodgeId = null;
                }
            }
        };

        c.addEventListener('touchend', endTouch);
        c.addEventListener('touchcancel', endTouch);

        // Dodge button
        if (this._dodgeBtn) {
            this._dodgeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.touchDodge = true;
                this._keyDownQueue.add(' ');
            }, { passive: false });
        }
    }

    _updateKnob(dx, dy) {
        if (this._joystickKnob) {
            this._joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
    }

    update() {
        // Track just-pressed for edge detection
        this.justPressed = {};
        for (const key in this.keys) {
            if (this.keys[key] && !this._prevKeys[key]) {
                this.justPressed[key] = true;
            }
        }
        // Also include buffered presses (handles quick press+release between frames)
        for (const key of this._keyDownQueue) {
            this.justPressed[key] = true;
        }
        this._keyDownQueue.clear();
        this._prevKeys = { ...this.keys };

        // Reset one-shot touch inputs
        this.touchDodge = false;

        // Poll gamepad
        this._pollGamepad();
    }

    _pollGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.gamepadIndex = i;
                break;
            }
        }
    }

    getMovementVector() {
        let mx = 0, my = 0;

        // Keyboard
        if (this.keys['w'] || this.keys['arrowup']) my -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) my += 1;
        if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) mx += 1;

        // Gamepad
        if (this.gamepadIndex >= 0) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                const deadzone = 0.2;
                if (Math.abs(gp.axes[0]) > deadzone) mx += gp.axes[0];
                if (Math.abs(gp.axes[1]) > deadzone) my += gp.axes[1];
            }
        }

        // Touch joystick
        if (this.touchActive) {
            const dx = this.touchCurrentX - this.touchStartX;
            const dy = this.touchCurrentY - this.touchStartY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 50;
            if (dist > 5) {
                mx += (dx / Math.max(dist, maxDist));
                my += (dy / Math.max(dist, maxDist));
            }
        }

        // Normalize
        const len = Math.sqrt(mx * mx + my * my);
        if (len > 1) {
            mx /= len;
            my /= len;
        }

        return { x: mx, y: my };
    }

    isDodge() {
        return this.justPressed[' '] || this.touchDodge ||
            (this.gamepadIndex >= 0 && navigator.getGamepads()[this.gamepadIndex]?.buttons[0]?.pressed);
    }

    isPause() {
        return this.justPressed['escape'] || this.justPressed['p'];
    }

    // Consume a just-pressed key so it doesn't trigger again
    consume(key) {
        this.justPressed[key] = false;
    }
}
