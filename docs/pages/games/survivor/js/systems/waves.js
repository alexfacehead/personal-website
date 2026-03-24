// waves.js — Enemy wave scheduler with difficulty curve

import { ENEMY_TYPES } from '../data/enemies.js';

const ENEMY_UNLOCK_TIMES = {
    swarmer: 0,
    crawler: 30,
    spitter: 60,
    exploder: 120,
    ghost: 180
};

const BOSS_INTERVAL = 300; // 5 minutes

export class WaveSystem {
    constructor() {
        this.elapsed = 0;
        this.spawnTimer = 0;
        this.difficulty = 1;
        this.surgeTimer = 0;
        this.surgeActive = false;
        this.nextSurge = 45; // first surge at 45s
        this.bossSpawnedCount = 0;
        this.bossAlive = false;
        this.totalSpawned = 0;
    }

    reset() {
        this.elapsed = 0;
        this.spawnTimer = 0;
        this.difficulty = 1;
        this.surgeTimer = 0;
        this.surgeActive = false;
        this.nextSurge = 45;
        this.bossSpawnedCount = 0;
        this.bossAlive = false;
        this.totalSpawned = 0;
    }

    getDifficulty(time) {
        return 1 + (time / 60) * 1.5;
    }

    getSpawnRate(difficulty) {
        // Base rate: 1 enemy per second, scaling with difficulty
        return Math.max(0.08, 1.0 / (difficulty * 0.8));
    }

    getAvailableEnemyTypes(time) {
        const available = [];
        for (const [type, unlockTime] of Object.entries(ENEMY_UNLOCK_TIMES)) {
            if (time >= unlockTime) {
                available.push(type);
            }
        }
        return available;
    }

    selectEnemyType(available, difficulty) {
        // Weight toward harder enemies as difficulty increases
        if (available.length === 1) return available[0];

        const weights = available.map((type, i) => {
            // Later enemies get more weight as difficulty grows
            const baseWeight = type === 'swarmer' ? 5 : 3;
            const difficultyBonus = i * (difficulty - 1) * 0.3;
            return Math.max(1, baseWeight + difficultyBonus);
        });

        const total = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * total;

        for (let i = 0; i < available.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return available[i];
        }

        return available[available.length - 1];
    }

    getSpawnPosition(playerX, playerY, canvasWidth, canvasHeight) {
        // Spawn on a circle around the player, just outside the viewport
        const spawnDist = Math.max(canvasWidth, canvasHeight) * 0.6 + 50;
        const angle = Math.random() * Math.PI * 2;
        return {
            x: playerX + Math.cos(angle) * spawnDist,
            y: playerY + Math.sin(angle) * spawnDist
        };
    }

    getGroupSpawnPositions(playerX, playerY, canvasWidth, canvasHeight, count) {
        const baseAngle = Math.random() * Math.PI * 2;
        const spawnDist = Math.max(canvasWidth, canvasHeight) * 0.6 + 50;
        const positions = [];

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * 0.5;
            const dist = spawnDist + (Math.random() - 0.5) * 40;
            positions.push({
                x: playerX + Math.cos(angle) * dist,
                y: playerY + Math.sin(angle) * dist
            });
        }

        return positions;
    }

    update(dt, playerX, playerY, canvasWidth, canvasHeight, activeEnemyCount, maxEnemies) {
        this.elapsed += dt;
        this.difficulty = this.getDifficulty(this.elapsed);

        const spawns = [];

        // Check boss spawn
        const expectedBosses = Math.floor(this.elapsed / BOSS_INTERVAL);
        if (expectedBosses > this.bossSpawnedCount && !this.bossAlive) {
            const pos = this.getSpawnPosition(playerX, playerY, canvasWidth, canvasHeight);
            spawns.push({ type: 'boss', x: pos.x, y: pos.y });
            this.bossSpawnedCount = expectedBosses;
            this.bossAlive = true;
        }

        // Surge check
        if (this.elapsed >= this.nextSurge && !this.surgeActive) {
            this.surgeActive = true;
            this.surgeTimer = 10; // 10 second surge
            this.nextSurge = this.elapsed + 45 + Math.random() * 15;
        }

        if (this.surgeActive) {
            this.surgeTimer -= dt;
            if (this.surgeTimer <= 0) {
                this.surgeActive = false;
            }
        }

        // Regular spawning
        if (activeEnemyCount >= maxEnemies) return spawns;

        const spawnRate = this.getSpawnRate(this.difficulty);
        const rate = this.surgeActive ? spawnRate * 0.5 : spawnRate;

        this.spawnTimer += dt;

        while (this.spawnTimer >= rate && activeEnemyCount + spawns.length < maxEnemies) {
            this.spawnTimer -= rate;

            const available = this.getAvailableEnemyTypes(this.elapsed);
            const type = this.selectEnemyType(available, this.difficulty);

            // Sometimes spawn groups
            const groupSize = this.difficulty > 3 && Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 2 : 1;
            const positions = groupSize > 1
                ? this.getGroupSpawnPositions(playerX, playerY, canvasWidth, canvasHeight, groupSize)
                : [this.getSpawnPosition(playerX, playerY, canvasWidth, canvasHeight)];

            for (const pos of positions) {
                spawns.push({ type, x: pos.x, y: pos.y });
                this.totalSpawned++;
            }
        }

        return spawns;
    }

    onBossDied() {
        this.bossAlive = false;
    }

    getTimerDisplay() {
        const mins = Math.floor(this.elapsed / 60);
        const secs = Math.floor(this.elapsed % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
