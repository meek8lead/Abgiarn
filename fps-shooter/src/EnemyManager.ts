import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PlayerController } from './PlayerController';
import { BulletManager } from './BulletManager';
import { Game } from './Game';

interface Enemy {
    mesh: any;
    health: number;
    speed: number;
    damage: number;
    lastAttackTime: number;
    attackCooldown: number;
}

export class EnemyManager {
    private scene: Scene;
    private playerController: PlayerController;
    private bulletManager: BulletManager;
    private game: Game;
    private enemies: Enemy[] = [];
    private spawnInterval: number = 2000; // ms
    private lastSpawnTime: number = 0;
    private isSpawning: boolean = false;
    private enemyDamage: number = 10;
    private enemySpeed: number = 3;

    constructor(scene: Scene, playerController: PlayerController, bulletManager: BulletManager, game: Game) {
        this.scene = scene;
        this.playerController = playerController;
        this.bulletManager = bulletManager;
        this.game = game;
        
        // Listen for player death
        this.scene.on("playerDeath", () => {
            this.isSpawning = false;
            this.game.gameOver();
        });
    }

    public startSpawning(): void {
        this.isSpawning = true;
    }

    public update(): void {
        if (!this.isSpawning) return;

        const now = Date.now();

        // Spawn enemies
        if (now - this.lastSpawnTime > this.spawnInterval && this.enemies.length < 10) {
            this.spawnEnemy();
            this.lastSpawnTime = now;
            
            // Increase difficulty over time
            if (this.spawnInterval > 500) {
                this.spawnInterval -= 10;
            }
        }

        // Update enemies
        this.updateEnemies(now);
    }

    private spawnEnemy(): void {
        // Random position away from player
        const playerPos = this.playerController.getPosition();
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        const x = playerPos.x + Math.cos(angle) * distance;
        const z = playerPos.z + Math.sin(angle) * distance;

        // Create enemy mesh (red box)
        const enemy = MeshBuilder.CreateBox("enemy", { size: 1.5 }, this.scene);
        const enemyMat = new StandardMaterial("enemyMat", this.scene);
        enemyMat.diffuseColor = new Color3(1, 0, 0);
        enemyMat.emissiveColor = new Color3(0.3, 0, 0);
        enemy.material = enemyMat;
        
        enemy.position = new Vector3(x, 0.75, z);

        this.enemies.push({
            mesh: enemy,
            health: 30,
            speed: this.enemySpeed + Math.random() * 2,
            damage: this.enemyDamage,
            lastAttackTime: 0,
            attackCooldown: 1000
        });
    }

    private updateEnemies(now: number): void {
        const playerPos = this.playerController.getPosition();

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (!enemy.mesh) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Move towards player
            const direction = playerPos.subtract(enemy.mesh.position);
            direction.y = 0;
            direction.normalize();
            
            const moveAmount = direction.scale(enemy.speed * 0.016);
            enemy.mesh.position.addInPlace(moveAmount);
            
            // Make enemy look at player
            enemy.mesh.lookAt(new Vector3(playerPos.x, enemy.mesh.position.y, playerPos.z));

            // Check collision with player
            const distanceToPlayer = Vector3.Distance(enemy.mesh.position, playerPos);
            if (distanceToPlayer < 2 && now - enemy.lastAttackTime > enemy.attackCooldown) {
                this.playerController.takeDamage(enemy.damage);
                enemy.lastAttackTime = now;
                
                // Check if player died
                if (this.playerController.getHealth() <= 0) {
                    this.isSpawning = false;
                }
            }

            // Check if enemy was hit by bullets
            if (this.bulletManager.checkCollision(enemy.mesh.position, 0.75)) {
                enemy.health -= 10;
                
                // Flash effect
                enemy.mesh.material.emissiveColor = new Color3(1, 1, 1);
                setTimeout(() => {
                    if (enemy.mesh && enemy.mesh.material) {
                        enemy.mesh.material.emissiveColor = new Color3(0.3, 0, 0);
                    }
                }, 100);

                if (enemy.health <= 0) {
                    // Enemy killed
                    enemy.mesh.dispose();
                    this.enemies.splice(i, 1);
                    this.game.addScore(100);
                }
            }
        }
    }

    public getEnemyCount(): number {
        return this.enemies.length;
    }
}
