import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

// Import game classes
import { PlayerController } from './PlayerController';
import { EnemyManager } from './EnemyManager';
import { BulletManager } from './BulletManager';

export class Game {
    private engine: Engine;
    private scene: Scene;
    private playerController!: PlayerController;
    private enemyManager!: EnemyManager;
    private bulletManager!: BulletManager;
    private score: number = 0;
    private isGameOver: boolean = false;

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
    }

    public async init(): Promise<void> {
        await this.createScene();
        this.setupInputs();
        this.startGameLoop();
    }

    private async createScene(): Promise<void> {
        // Setup FPS camera
        const camera = new UniversalCamera("camera", new Vector3(0, 2, 0), this.scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(this.canvas, true);
        camera.minZ = 0.1;
        
        // Lock cursor for FPS controls
        (camera as any).lockCursor = true;

        // Setup lighting
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // Create ground
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new Color3(0.3, 0.5, 0.3);
        ground.material = groundMat;

        // Create skybox
        const skybox = MeshBuilder.CreateBox("skybox", { size: 1000 }, this.scene);
        const skyboxMat = new StandardMaterial("skyboxMat", this.scene);
        skyboxMat.backFaceCulling = false;
        skyboxMat.reflectionTexture = null;
        skyboxMat.diffuseColor = new Color3(0, 0, 0);
        skyboxMat.specularColor = new Color3(0, 0, 0);
        skybox.material = skyboxMat;

        // Add some obstacles
        this.createObstacles();

        // Initialize game systems
        this.playerController = new PlayerController(camera, this.scene, this.canvas);
        this.bulletManager = new BulletManager(this.scene);
        this.enemyManager = new EnemyManager(this.scene, this.playerController, this.bulletManager, this);

        // Start enemy spawning
        this.enemyManager.startSpawning();
    }

    private createObstacles(): void {
        const obstacleMat = new StandardMaterial("obstacleMat", this.scene);
        obstacleMat.diffuseColor = new Color3(0.6, 0.6, 0.6);

        // Create random boxes as obstacles
        for (let i = 0; i < 20; i++) {
            const size = Math.random() * 3 + 1;
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            
            // Don't place obstacles too close to spawn
            if (Math.sqrt(x * x + z * z) < 10) continue;

            const box = MeshBuilder.CreateBox(`obstacle_${i}`, { size }, this.scene);
            box.position = new Vector3(x, size / 2, z);
            box.material = obstacleMat;
        }
    }

    private setupInputs(): void {
        // Pointer lock for FPS controls
        this.canvas.addEventListener('click', () => {
            if (!this.isGameOver) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            const instructions = document.getElementById('instructions');
            if (document.pointerLockElement === this.canvas) {
                if (instructions) instructions.style.display = 'none';
            } else {
                if (instructions && !this.isGameOver) instructions.style.display = 'block';
            }
        });
    }

    private startGameLoop(): void {
        this.engine.runRenderLoop(() => {
            if (!this.isGameOver) {
                this.scene.render();
                this.playerController.update();
                this.bulletManager.update();
                this.enemyManager.update();
            }
        });

        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    public addScore(points: number): void {
        this.score += points;
    }

    public getScore(): number {
        return this.score;
    }

    public gameOver(): void {
        this.isGameOver = true;
        const gameOverScreen = document.getElementById('game-over');
        const finalScore = document.getElementById('final-score');
        if (gameOverScreen && finalScore) {
            finalScore.textContent = this.score.toString();
            gameOverScreen.style.display = 'flex';
        }
        document.exitPointerLock();
    }
}
