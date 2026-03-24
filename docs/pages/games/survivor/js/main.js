// main.js — Entry point, game loop, state machine for Void Survivors

import { Renderer } from './engine/canvas.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { SpatialHash } from './engine/spatial-hash.js';
import { Pool } from './engine/pool.js';
import { ParticleSystem, FX } from './engine/particles.js';

import { Player } from './entities/player.js';
import { initEnemy, updateEnemy, renderEnemy, resetEnemy } from './entities/enemy.js';
import { initProjectile, updateProjectile, renderProjectile, resetProjectile } from './entities/projectile.js';
import { initPickup, updatePickup, renderPickup, resetPickup } from './entities/pickup.js';

import { WeaponManager } from './systems/weapons.js';
import { WaveSystem } from './systems/waves.js';
import { UpgradeSystem } from './systems/upgrades.js';
import { World } from './systems/world.js';
import { circlesCollide, applySeparation, applyDamageToEnemy, applyKnockback } from './systems/combat.js';

import { HUD } from './ui/hud.js';
import { MenuSystem } from './ui/menus.js';
import { Minimap } from './ui/minimap.js';

// --- Constants ---
const TICK = 1000 / 60;
const MAX_ENEMIES = 300;
const MAX_PROJECTILES = 150;
const MAX_PICKUPS = 200;

// --- Game States ---
const STATE = { TITLE: 0, PLAYING: 1, LEVEL_UP: 2, PAUSED: 3, GAME_OVER: 4 };

class Game {
    constructor() {
        this.renderer = new Renderer('game');
        this.input = new Input(this.renderer.canvas);
        this.audio = new Audio();
        this.spatialHash = new SpatialHash(128);
        this.particles = new ParticleSystem(600);
        this.world = new World();
        this.hud = new HUD();
        this.menus = new MenuSystem();
        this.minimap = new Minimap();

        // Entity pools
        this.enemyPool = new Pool(
            () => ({ alive: false, _poolIndex: 0, x: 0, y: 0, radius: 10 }),
            resetEnemy,
            MAX_ENEMIES
        );
        this.projectilePool = new Pool(
            () => ({ alive: false, _poolIndex: 0, x: 0, y: 0, radius: 5, hitEntities: new Set() }),
            resetProjectile,
            MAX_PROJECTILES
        );
        this.pickupPool = new Pool(
            () => ({ alive: false, _poolIndex: 0, x: 0, y: 0, radius: 5 }),
            resetPickup,
            MAX_PICKUPS
        );

        // Game objects
        this.player = new Player();
        this.weaponManager = new WeaponManager();
        this.waveSystem = new WaveSystem();
        this.upgradeSystem = new UpgradeSystem();

        // State
        this.state = STATE.TITLE;
        this.accumulator = 0;
        this.lastTime = 0;
        this.gameTime = 0;
        this.fps = 60;
        this.fpsFrames = 0;
        this.fpsTimer = 0;
        this.pendingLevelUp = false;

        this._bindButtons();
        this.menus.showTitle();

        // Start loop
        requestAnimationFrame((t) => this._loop(t));
    }

    _bindButtons() {
        document.getElementById('start-btn').addEventListener('click', () => this._startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this._resume());
        document.getElementById('restart-btn').addEventListener('click', () => this._startGame());
        document.getElementById('retry-btn').addEventListener('click', () => this._startGame());

        // Audio init on first interaction
        const initAudio = () => {
            this.audio.init();
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('keydown', initAudio);
    }

    _startGame() {
        this.player.reset();
        this.weaponManager.reset();
        this.waveSystem.reset();
        this.upgradeSystem.reset();
        this.spatialHash.clear();
        this.particles.clear();
        this.world.reset();
        this.hud.damageNumbers = [];
        this.enemyPool.releaseAll();
        this.projectilePool.releaseAll();
        this.pickupPool.releaseAll();
        this.pendingLevelUp = false;
        this.gameTime = 0;

        // Start with orbitals
        this.weaponManager.addWeapon('orbital');
        this.player.weapons = this.weaponManager.getWeaponIds();

        this.state = STATE.PLAYING;
        this.menus.hideTitle();
        this.menus.hideDeath();
        this.menus.hidePause();

        this.renderer.camera.x = 0;
        this.renderer.camera.y = 0;
    }

    _resume() {
        this.state = STATE.PLAYING;
        this.menus.hidePause();
    }

    _loop(timestamp) {
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // FPS tracking
        this.fpsFrames++;
        this.fpsTimer += delta;
        if (this.fpsTimer >= 1000) {
            this.fps = this.fpsFrames;
            this.fpsFrames = 0;
            this.fpsTimer -= 1000;
        }

        // Fixed timestep with accumulator
        this.accumulator += Math.min(delta, 200); // Cap to prevent spiral

        if (this.state === STATE.PLAYING) {
            while (this.accumulator >= TICK) {
                const dt = (TICK / 1000) * this.renderer.camera.timeScale;
                this._update(dt);
                this.accumulator -= TICK;
            }
        } else {
            this.accumulator = 0; // Don't accumulate while paused
        }

        this._render();
        this.input.update();

        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        this.gameTime += dt;

        // Pause check
        if (this.input.isPause()) {
            this.state = STATE.PAUSED;
            this.menus.showPause();
            return;
        }

        // Toggle FPS with F key
        if (this.input.justPressed['f']) {
            this.hud.showFps = !this.hud.showFps;
        }

        // Player
        this.player.update(dt, this.input, this.particles, this.audio);

        if (!this.player.alive) {
            this.state = STATE.GAME_OVER;
            this.menus.showDeath(this.player, this.waveSystem);
            return;
        }

        // Camera
        this.renderer.camera.follow(this.player, dt);
        this.renderer.camera.update(dt);

        // World
        this.world.update(this.player.x, this.player.y);

        // Wave spawning
        const spawns = this.waveSystem.update(
            dt, this.player.x, this.player.y,
            this.renderer.w, this.renderer.h,
            this.enemyPool.count, MAX_ENEMIES
        );

        for (const spawn of spawns) {
            if (this.enemyPool.count >= MAX_ENEMIES) break;
            const enemy = this.enemyPool.acquire();
            initEnemy(enemy, spawn.type, spawn.x, spawn.y, this.waveSystem.difficulty);
            enemy.spawnTime = this.gameTime;
            this.spatialHash.insert(enemy);

            if (spawn.type === 'boss' && this.audio) this.audio.bossAlert();
        }

        // Update enemies
        this.enemyPool.forEach((enemy) => {
            const action = updateEnemy(enemy, dt, this.player.x, this.player.y, this.gameTime);
            this.spatialHash.update(enemy);

            // Handle enemy actions
            if (action) {
                switch (action.type) {
                    case 'shoot':
                        if (this.projectilePool.count < MAX_PROJECTILES) {
                            const proj = this.projectilePool.acquire();
                            initProjectile(proj, {
                                x: action.x, y: action.y,
                                dirX: action.dirX, dirY: action.dirY,
                                speed: action.speed,
                                damage: action.damage,
                                radius: 4,
                                isPlayerOwned: false,
                                color: '#eab308',
                                lifetime: 4
                            });
                        }
                        break;

                    case 'radialShot': {
                        const count = action.count || 8;
                        for (let i = 0; i < count; i++) {
                            if (this.projectilePool.count >= MAX_PROJECTILES) break;
                            const angle = (Math.PI * 2 * i) / count;
                            const proj = this.projectilePool.acquire();
                            initProjectile(proj, {
                                x: action.x, y: action.y,
                                dirX: Math.cos(angle), dirY: Math.sin(angle),
                                speed: 160,
                                damage: 15,
                                radius: 5,
                                isPlayerOwned: false,
                                color: '#a855f7',
                                lifetime: 3
                            });
                        }
                        break;
                    }

                    case 'summon': {
                        const count = action.count || 3;
                        for (let i = 0; i < count; i++) {
                            if (this.enemyPool.count >= MAX_ENEMIES) break;
                            const angle = Math.random() * Math.PI * 2;
                            const dist = 40 + Math.random() * 30;
                            const e = this.enemyPool.acquire();
                            initEnemy(e, 'swarmer', action.x + Math.cos(angle) * dist,
                                action.y + Math.sin(angle) * dist, this.waveSystem.difficulty);
                            this.spatialHash.insert(e);
                        }
                        break;
                    }

                    case 'explode':
                        this.particles.emit(FX.explosion(action.x, action.y));
                        if (this.audio) this.audio.explosion();
                        this.renderer.camera.shake(6, 0.2);

                        // Damage player if in range
                        const pdx = this.player.x - action.x;
                        const pdy = this.player.y - action.y;
                        if (pdx * pdx + pdy * pdy < action.radius * action.radius) {
                            this.player.takeDamage(action.damage, this.audio);
                        }

                        // Kill the exploder
                        enemy.hp = 0;
                        break;
                }
            }

            // Enemy-player collision (contact damage)
            if (circlesCollide(enemy.x, enemy.y, enemy.radius, this.player.x, this.player.y, this.player.radius)) {
                if (this.player.takeDamage(enemy.damage, this.audio)) {
                    this.renderer.camera.shake(4, 0.15);
                    applyKnockback(enemy, this.player.x, this.player.y, 120);
                }
            }

            // Check if enemy is dead
            if (enemy.hp <= 0) {
                this._onEnemyDeath(enemy);
            }
        });

        // Separation steering
        applySeparation(this.enemyPool, this.spatialHash);

        // Update weapons
        this.weaponManager.update(
            dt, this.player, this.enemyPool, this.projectilePool,
            this.spatialHash, this.particles, this.audio, this.renderer
        );

        // Update projectiles
        this.projectilePool.forEach((proj) => {
            const alive = updateProjectile(proj, dt, this.enemyPool, this.player.x, this.player.y);
            if (!alive) {
                this.projectilePool.release(proj);
                return;
            }

            if (proj.isPlayerOwned) {
                // Check collision with enemies
                const nearby = this.spatialHash.queryRadius(proj.x, proj.y, proj.radius + 20);
                for (const enemy of nearby) {
                    if (!enemy.alive || proj.hitEntities.has(enemy)) continue;
                    if (circlesCollide(proj.x, proj.y, proj.radius, enemy.x, enemy.y, enemy.radius)) {
                        proj.hitEntities.add(enemy);
                        const result = applyDamageToEnemy(enemy, proj.damage, this.player, this.particles, this.audio, FX);
                        applyKnockback(enemy, proj.x, proj.y, 60);

                        if (result.dealt > 0) {
                            this.hud.addDamageNumber(enemy.x, enemy.y - enemy.radius, result.dealt, result.isCrit);
                        }

                        if (enemy.hp <= 0) {
                            this._onEnemyDeath(enemy);
                        }

                        if (proj.pierceCount >= proj.pierce) {
                            this.projectilePool.release(proj);
                            return;
                        }
                        proj.pierceCount++;
                    }
                }
            } else {
                // Enemy projectile — check collision with player
                if (circlesCollide(proj.x, proj.y, proj.radius, this.player.x, this.player.y, this.player.radius)) {
                    if (this.player.takeDamage(proj.damage, this.audio)) {
                        this.renderer.camera.shake(3, 0.1);
                    }
                    this.projectilePool.release(proj);
                }
            }
        });

        // Update pickups
        this.pickupPool.forEach((pickup) => {
            const collected = updatePickup(pickup, dt, this.player.x, this.player.y, this.player.pickupRadius);
            if (collected) {
                if (pickup.xp > 0) {
                    const leveledUp = this.player.addXp(pickup.xp, this.particles, this.audio);
                    if (leveledUp) {
                        this.pendingLevelUp = true;
                    }
                }
                if (pickup.heal > 0) {
                    this.player.hp = Math.min(this.player.hp + pickup.heal, this.player.maxHp);
                    this.particles.emit(FX.heal(this.player.x, this.player.y));
                }
                if (pickup.isChest) {
                    // Grant random upgrade immediately
                    this.pendingLevelUp = true;
                }
                this.particles.emit(FX.xpPickup(pickup.x, pickup.y));
                if (this.audio) this.audio.pickup();
                this.pickupPool.release(pickup);
            }
        });

        // Check pending level up
        if (this.pendingLevelUp) {
            this.pendingLevelUp = false;
            const choices = this.upgradeSystem.generateChoices(this.player, this.weaponManager, 3);
            this.state = STATE.LEVEL_UP;
            this.menus.showLevelUp(choices, (choice) => {
                this.upgradeSystem.applyChoice(choice, this.player, this.weaponManager);
                this.player.weapons = this.weaponManager.getWeaponIds();
                this.state = STATE.PLAYING;
            });
            return;
        }

        // Update particles
        this.particles.update(dt);

        // Update HUD
        this.hud.update(dt);
    }

    _onEnemyDeath(enemy) {
        if (!enemy.alive) return;

        this.player.kills++;
        this.particles.emit(FX.enemyDeath(enemy.x, enemy.y, enemy.color));
        if (this.audio) this.audio.kill();
        this.renderer.camera.shake(2, 0.08);

        if (enemy.isBoss) {
            this.waveSystem.onBossDied();
            this.renderer.camera.shake(10, 0.4);
            this.renderer.camera.triggerSlowMo(0.2, 0.5);
            this.particles.emit(FX.explosion(enemy.x, enemy.y));

            // Drop lots of XP
            for (let i = 0; i < 15; i++) {
                if (this.pickupPool.count >= MAX_PICKUPS) break;
                const p = this.pickupPool.acquire();
                initPickup(p, 'xp_large',
                    enemy.x + (Math.random() - 0.5) * 40,
                    enemy.y + (Math.random() - 0.5) * 40);
            }
        } else {
            // Drop XP gem
            if (this.pickupPool.count < MAX_PICKUPS) {
                const gemType = enemy.xp >= 15 ? 'xp_large' : enemy.xp >= 5 ? 'xp_medium' : 'xp_small';
                const p = this.pickupPool.acquire();
                initPickup(p, gemType, enemy.x, enemy.y);
            }

            // Rare health orb drop (3%)
            if (Math.random() < 0.03 && this.pickupPool.count < MAX_PICKUPS) {
                const p = this.pickupPool.acquire();
                initPickup(p, 'health', enemy.x, enemy.y);
            }

            // Exploder death explosion
            if (enemy.type === 'exploder' && !enemy.exploding) {
                enemy.exploding = true;
                enemy.explodeTimer = 0.4;
                return; // Don't kill yet
            }
        }

        this.spatialHash.remove(enemy);
        this.enemyPool.release(enemy);
    }

    _render() {
        const { ctx } = this.renderer;

        // World space rendering
        this.renderer.beginFrame();

        // World background
        this.world.render(ctx, this.renderer);

        // Pickups (under entities)
        this.pickupPool.forEachForward((pickup) => {
            if (this.renderer.isVisible(pickup.x, pickup.y, 20)) {
                renderPickup(pickup, ctx, this.renderer);
            }
        });

        // Enemies
        this.enemyPool.forEachForward((enemy) => {
            if (this.renderer.isVisible(enemy.x, enemy.y, enemy.radius + 20)) {
                renderEnemy(enemy, ctx, this.renderer);
            }
        });

        // Projectiles
        this.projectilePool.forEachForward((proj) => {
            if (this.renderer.isVisible(proj.x, proj.y, proj.radius + 20)) {
                renderProjectile(proj, ctx, this.renderer);
            }
        });

        // Player
        this.player.render(ctx, this.renderer);

        // Weapons (visual effects)
        this.weaponManager.render(ctx, this.renderer, this.player);

        // Particles
        this.particles.render(ctx, this.renderer);

        // Damage numbers (world space)
        this.hud.renderWorldSpace(ctx, this.renderer);

        this.renderer.endFrame();

        // Screen space rendering (HUD)
        if (this.state === STATE.PLAYING || this.state === STATE.LEVEL_UP) {
            this.renderer.beginScreenSpace();
            this.hud.render(ctx, this.renderer, this.player, this.waveSystem, this.fps);
            this.minimap.render(ctx, this.renderer, this.player, this.enemyPool);
            this.renderer.endScreenSpace();
        }
    }
}

// --- Initialize ---
const game = new Game();
