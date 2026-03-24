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
import { MetaSystem } from './systems/meta.js';
import { circlesCollide, applySeparation, applyDamageToEnemy, applyKnockback } from './systems/combat.js';

import { HUD } from './ui/hud.js';
import { MenuSystem } from './ui/menus.js';
import { Minimap } from './ui/minimap.js';

// --- Constants ---
const TICK = 1000 / 60;
const MAX_ENEMIES = 150;
const MAX_PROJECTILES = 100;
const MAX_PICKUPS = 120;

// --- Game States ---
const STATE = { TITLE: 0, PLAYING: 1, LEVEL_UP: 2, PAUSED: 3, GAME_OVER: 4, VICTORY: 5 };
const VICTORY_TIME = 900; // 15 minutes in seconds

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
        this.metaSystem = new MetaSystem();
        this.coinsThisRun = 0;

        // Obelisk boss encounter
        this.obelisk = null;
        this.obeliskNpc = null;
        this.rainbowWatcherSpawned = false;
        this.obeliskSpawnTime = 120; // 2 minutes into the game

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
        this.menus.showTitle(this.metaSystem);

        // Start loop
        requestAnimationFrame((t) => this._loop(t));
    }

    _bindButtons() {
        document.getElementById('start-btn').addEventListener('click', () => this._startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this._resume());
        document.getElementById('restart-btn').addEventListener('click', () => this._startGame());
        document.getElementById('retry-btn').addEventListener('click', () => this._startGame());
        document.getElementById('victory-btn').addEventListener('click', () => this._startGame());
        document.getElementById('menu-btn').addEventListener('click', () => this._returnToMenu());
        document.getElementById('shop-btn').addEventListener('click', () => this.menus.showShop(this.metaSystem));
        document.getElementById('shop-back-btn').addEventListener('click', () => this.menus.showTitle(this.metaSystem));

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
        this.obelisk = null;
        this.obeliskNpc = null;
        this.rainbowWatcherSpawned = false;

        // Apply persistent meta-upgrades
        this.metaSystem.applyToPlayer(this.player);
        this.player.maxWeapons = 6 + this.metaSystem.getLevel('startWeaponSlot');
        this.coinsThisRun = 0;

        // Start with orbitals
        this.weaponManager.addWeapon('orbital');
        // Headstart: level up starting weapon
        const headstartLevel = this.metaSystem.getLevel('startWeaponLevel');
        for (let i = 0; i < headstartLevel; i++) {
            this.weaponManager.upgradeWeapon('orbital');
        }
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

    _returnToMenu() {
        this.menus.hidePause();
        this.state = STATE.TITLE;
        this.menus.showTitle(this.metaSystem);
    }

    _triggerJuggernaut() {
        if (!this.player._juggernautShockwave) return;
        this.player._juggernautShockwave = false;
        const nearby = this.spatialHash.queryRadius(this.player.x, this.player.y, 120);
        for (const enemy of nearby) {
            if (!enemy.alive) continue;
            applyDamageToEnemy(enemy, 50, this.player, this.particles, this.audio, FX);
            applyKnockback(enemy, this.player.x, this.player.y, 200);
        }
        this.renderer.camera.shake(6, 0.2);
        this.particles.emit(FX.explosion(this.player.x, this.player.y));
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

        this.input.update();

        // Pause/unpause at frame level (before physics ticks) so it never gets lost
        if (this.input.isPause()) {
            this.input.consume('p');
            this.input.consume('escape');
            if (this.state === STATE.PLAYING) {
                this.state = STATE.PAUSED;
                this.accumulator = 0;
                this.menus.showPause(this.weaponManager, this.player);
            } else if (this.state === STATE.PAUSED) {
                this._resume();
            }
        }

        if (this.state === STATE.PLAYING) {
            while (this.accumulator >= TICK) {
                const dt = (TICK / 1000) * this.renderer.camera.timeScale;
                this._update(dt);
                this.accumulator -= TICK;
                if (this.state !== STATE.PLAYING) break; // Stop ticking if state changed
            }
        } else if (this.state === STATE.PAUSED) {
            this.accumulator = 0;
        } else {
            this.accumulator = 0;
        }

        this._render();

        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        this.gameTime += dt;

        // Victory check — survive 15 minutes
        if (this.gameTime >= VICTORY_TIME) {
            this.state = STATE.VICTORY;
            // Victory coin bonus
            const victoryBonus = 100;
            this.coinsThisRun += victoryBonus;
            this.metaSystem.addCoins(victoryBonus);
            this.menus.showVictory(this.player, this.waveSystem, this.coinsThisRun);
            return;
        }

        // Pause check
        // Toggle FPS with F key
        if (this.input.justPressed['f']) {
            this.hud.showFps = !this.hud.showFps;
        }

        // Obelisk spawn check
        if (!this.obelisk && !this.rainbowWatcherSpawned && this.gameTime >= this.obeliskSpawnTime) {
            // Spawn obelisk at a random position near the player
            const angle = Math.random() * Math.PI * 2;
            const dist = 300 + Math.random() * 100;
            this.obelisk = {
                x: this.player.x + Math.cos(angle) * dist,
                y: this.player.y + Math.sin(angle) * dist,
                pulseTime: 0,
                activated: false
            };
            this.obeliskNpc = {
                x: this.obelisk.x + 40,
                y: this.obelisk.y + 20,
                bubbleAlpha: 0
            };
            this.hud.showNotification('A strange obelisk has appeared...', '#a78bfa', 4.0);
        }

        // Obelisk interaction
        if (this.obelisk && !this.obelisk.activated) {
            this.obelisk.pulseTime += dt;
            if (this.obeliskNpc) {
                const npcDist = Math.hypot(this.player.x - this.obeliskNpc.x, this.player.y - this.obeliskNpc.y);
                this.obeliskNpc.bubbleAlpha = npcDist < 120 ? Math.min(1, this.obeliskNpc.bubbleAlpha + dt * 3) : Math.max(0, this.obeliskNpc.bubbleAlpha - dt * 2);
            }
            // Check player collision with obelisk
            const obDist = Math.hypot(this.player.x - this.obelisk.x, this.player.y - this.obelisk.y);
            if (obDist < 30) {
                this.obelisk.activated = true;
                this.rainbowWatcherSpawned = true;
                // Clear all enemies (no drops) — collect first, then release
                const toClear = [];
                this.enemyPool.forEachForward((enemy) => {
                    if (!enemy.isRainbowWatcher) toClear.push(enemy);
                });
                for (let i = toClear.length - 1; i >= 0; i--) {
                    this.spatialHash.remove(toClear[i]);
                    toClear[i].alive = false;
                    this.enemyPool.release(toClear[i]);
                }
                // Spawn Rainbow Watcher
                const boss = this.enemyPool.acquire();
                initEnemy(boss, 'rainbowWatcher', this.obelisk.x, this.obelisk.y - 80, this.waveSystem.difficulty);
                this.spatialHash.insert(boss);
                this.hud.showNotification('THE RAINBOW WATCHER AWAKENS', '#fff', 5.0);
                this.renderer.camera.shake(12, 1.0);
                this.renderer.camera.triggerSlowMo(0.15, 1.0);
                if (this.particles) {
                    for (let i = 0; i < 5; i++) {
                        this.particles.emit(FX.explosion(this.obelisk.x + (Math.random()-0.5)*60, this.obelisk.y + (Math.random()-0.5)*60));
                    }
                }
                if (this.audio) this.audio.explosion();
            }
        }

        // Player
        this.player.update(dt, this.input, this.particles, this.audio);

        if (!this.player.alive) {
            // Second Wind revive check
            if (this.player.revivesLeft > 0) {
                this.player.revivesLeft--;
                this.player.alive = true;
                this.player.hp = Math.floor(this.player.maxHp * 0.3);
                this.player.invincible = true;
                this.player.invincibleTimer = 2.0;
                this.renderer.camera.shake(8, 0.3);
                this.renderer.camera.triggerSlowMo(0.2, 0.8);
                this.hud.showNotification('★ SECOND WIND ★', '#f43f5e', 3.0);
                this.particles.emit(FX.explosion(this.player.x, this.player.y));
                // Knockback all nearby enemies
                const nearby = this.spatialHash.queryRadius(this.player.x, this.player.y, 200);
                for (const enemy of nearby) {
                    if (!enemy.alive) continue;
                    applyKnockback(enemy, this.player.x, this.player.y, 300);
                }
            } else {
                this.state = STATE.GAME_OVER;
                this.menus.showDeath(this.player, this.waveSystem, this.coinsThisRun);
                return;
            }
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

                    case 'fanShot': {
                        const count = action.count || 5;
                        const spread = action.spread || 1.0;
                        const baseAngle = Math.atan2(action.dirY || 0, action.dirX || 1);
                        for (let i = 0; i < count; i++) {
                            if (this.projectilePool.count >= MAX_PROJECTILES) break;
                            const angle = baseAngle - spread / 2 + (spread * i) / (count - 1 || 1);
                            const proj = this.projectilePool.acquire();
                            initProjectile(proj, {
                                x: action.x, y: action.y,
                                dirX: Math.cos(angle), dirY: Math.sin(angle),
                                speed: 180,
                                damage: 18,
                                radius: 5,
                                isPlayerOwned: false,
                                color: '#f472b6',
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
                    // Iron Skin: reflect damage to attacker
                    if (this.player._reflectDamage > 0) {
                        applyDamageToEnemy(enemy, this.player._reflectDamage, this.player, this.particles, this.audio, FX);
                        this.player._reflectDamage = 0;
                    }
                    // Juggernaut: shockwave on hit
                    this._triggerJuggernaut();
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
                            // Void Siphon synergy: missile kills heal
                            if (this.player.synergies.voidSiphon) {
                                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
                            }
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
                if (pickup.isCoin) {
                    this.coinsThisRun += pickup.coinValue;
                    this.metaSystem.addCoins(pickup.coinValue);
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
            // Mark weapons as discovered
            for (const c of choices) {
                if (c.weaponId) this.player.discoveredWeapons.add(c.weaponId);
            }
            this.state = STATE.LEVEL_UP;
            this.menus.showLevelUp(choices, (choice) => {
                this.upgradeSystem.applyChoice(choice, this.player, this.weaponManager);
                this.player.weapons = this.weaponManager.getWeaponIds();
                if (choice.type === 'synergy') {
                    this.hud.showNotification(`★ SYNERGY UNLOCKED: ${choice.name} ★`, choice.color || '#f59e0b', 4.0);
                }
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

            // Rainbow Watcher boss drop — bonus weapon upgrade
            if (enemy.isRainbowWatcher) {
                this.hud.showNotification('RAINBOW WATCHER DEFEATED — BONUS UPGRADE!', '#fbbf24', 5.0);
                // Grant a free weapon upgrade to a random owned weapon
                const ownedWeapons = this.weaponManager.getWeaponList();
                if (ownedWeapons.length > 0) {
                    // Try to upgrade a random weapon, even past max
                    const target = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
                    this.weaponManager.upgradeWeapon(target.id, true); // force past max
                    this.hud.showNotification(`${this.weaponManager.getWeaponDef(target.id)?.name || target.id} EMPOWERED!`, '#a855f7', 3.0);
                }
                // Also drop a bunch of coins
                for (let i = 0; i < 20; i++) {
                    if (this.pickupPool.count >= MAX_PICKUPS) break;
                    const p = this.pickupPool.acquire();
                    initPickup(p, 'coin',
                        enemy.x + (Math.random() - 0.5) * 80,
                        enemy.y + (Math.random() - 0.5) * 80);
                }
            }

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
                let gemType = 'xp_small';
                if (enemy.xp >= 15) {
                    gemType = 'xp_large';
                } else if (enemy.xp >= 5) {
                    // Blue gems only drop 25% of the time; otherwise downgrade to green
                    gemType = Math.random() < 0.25 ? 'xp_medium' : 'xp_small';
                }
                const p = this.pickupPool.acquire();
                initPickup(p, gemType, enemy.x, enemy.y);
            }

            // Rare health orb drop (0.75%)
            if (Math.random() < 0.0075 && this.pickupPool.count < MAX_PICKUPS) {
                const p = this.pickupPool.acquire();
                initPickup(p, 'health', enemy.x, enemy.y);
            }

            // Coin drop
            if (Math.random() < this.metaSystem.getCoinDropChance() && this.pickupPool.count < MAX_PICKUPS) {
                const p = this.pickupPool.acquire();
                initPickup(p, 'coin', enemy.x, enemy.y);
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

        // Obelisk and NPC
        if (this.obelisk && !this.obelisk.activated) {
            const ob = this.obelisk;
            const t = ob.pulseTime;
            const pulse = 0.6 + Math.sin(t * 2) * 0.2;
            const hue = (t * 40) % 360;

            // Obelisk base - tall geometric shape
            ctx.save();
            ctx.translate(ob.x, ob.y);

            // Ground glow circle
            ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${0.08 + Math.sin(t * 3) * 0.03})`;
            ctx.beginPath();
            ctx.arc(0, 0, 50, 0, Math.PI * 2);
            ctx.fill();

            // Obelisk body — tall trapezoid
            ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
            ctx.shadowBlur = 15 * pulse;
            ctx.fillStyle = `hsla(${hue}, 60%, 15%, 0.9)`;
            ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, 20);
            ctx.lineTo(-6, -35);
            ctx.lineTo(6, -35);
            ctx.lineTo(10, 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Runes on obelisk
            for (let i = 0; i < 3; i++) {
                const ry = -20 + i * 14;
                const runeHue = (hue + i * 40) % 360;
                ctx.fillStyle = `hsla(${runeHue}, 90%, 70%, ${0.5 + Math.sin(t * 3 + i) * 0.3})`;
                ctx.fillRect(-3, ry, 6, 2);
            }

            // Top crystal
            ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${pulse})`;
            ctx.beginPath();
            ctx.moveTo(0, -42);
            ctx.lineTo(-4, -35);
            ctx.lineTo(4, -35);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();

            // Floating particles around obelisk
            for (let i = 0; i < 4; i++) {
                const pa = t * 1.5 + (Math.PI * 2 * i) / 4;
                const pr = 25 + Math.sin(t * 2 + i) * 8;
                const px = ob.x + Math.cos(pa) * pr;
                const py = ob.y + Math.sin(pa) * pr - 10;
                const pHue = (hue + i * 90) % 360;
                ctx.fillStyle = `hsla(${pHue}, 80%, 70%, 0.6)`;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // NPC
        if (this.obeliskNpc && this.obelisk && !this.obelisk.activated) {
            const npc = this.obeliskNpc;
            const bobY = Math.sin(performance.now() * 0.002) * 2;

            // NPC body — small hooded figure
            ctx.save();
            ctx.translate(npc.x, npc.y + bobY);

            // Cloak
            ctx.fillStyle = '#2d1b69';
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(-8, 6);
            ctx.lineTo(8, 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Hood
            ctx.fillStyle = '#1e1145';
            ctx.beginPath();
            ctx.arc(0, -12, 6, Math.PI, 0);
            ctx.fill();

            // Eyes — two small dots
            ctx.fillStyle = '#c4b5fd';
            ctx.beginPath();
            ctx.arc(-2, -10, 1.2, 0, Math.PI * 2);
            ctx.arc(2, -10, 1.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Speech bubble
            if (npc.bubbleAlpha > 0.01) {
                ctx.save();
                ctx.globalAlpha = npc.bubbleAlpha;

                const bx = npc.x;
                const by = npc.y - 30 + bobY;

                // Bubble background
                ctx.fillStyle = 'rgba(15,10,35,0.85)';
                ctx.strokeStyle = '#7c3aed';
                ctx.lineWidth = 1;
                const tw = 90;
                const th = 20;
                ctx.beginPath();
                ctx.roundRect(bx - tw / 2, by - th / 2, tw, th, 4);
                ctx.fill();
                ctx.stroke();

                // Tail
                ctx.fillStyle = 'rgba(15,10,35,0.85)';
                ctx.beginPath();
                ctx.moveTo(bx - 4, by + th / 2);
                ctx.lineTo(bx, by + th / 2 + 6);
                ctx.lineTo(bx + 4, by + th / 2);
                ctx.fill();

                // Text
                ctx.fillStyle = '#c4b5fd';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Ready to fight...?', bx, by);

                ctx.restore();
            }
        }

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
            this.hud.render(ctx, this.renderer, this.player, this.waveSystem, this.fps, this.metaSystem.getCoins(), this.weaponManager);
            this.minimap.render(ctx, this.renderer, this.player, this.enemyPool);

            // Damage vignette — red screen-edge flash
            if (this.player.damageFlashTimer > 0) {
                const t = this.player.damageFlashTimer / 0.25;
                const w = ctx.canvas.width;
                const h = ctx.canvas.height;
                const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
                grad.addColorStop(0, 'rgba(239,68,68,0)');
                grad.addColorStop(1, `rgba(239,68,68,${t * 0.35})`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }

            this.renderer.endScreenSpace();
        }
    }
}

// --- Initialize ---
const game = new Game();
