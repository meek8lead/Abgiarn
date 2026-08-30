import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Ray } from "@babylonjs/core/Culling/ray";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";

export interface GameConfig {
    canvas: HTMLCanvasElement;
}

export class FPSGame {
    private engine: Engine;
    private scene: Scene;
    private camera: UniversalCamera;
    private boxes: any[] = [];
    private canShoot: boolean = true;
    private moveForward: boolean = false;
    private moveBackward: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private playerSpeed: number = 0.15;

    constructor(config: GameConfig) {
        this.engine = new Engine(config.canvas, true);
        this.scene = this.createScene();
        this.setupInputs();
        this.startRenderLoop();
        this.setupResizeHandler();
    }

    private createScene(): Scene {
        const scene = new Scene(this.engine);
        scene.clearColor = new Color4(0.1, 0.1, 0.2, 1);

        // Camera (FPS view)
        this.camera = new UniversalCamera("camera", new Vector3(0, 1.7, 0), scene);
        this.camera.setTarget(new Vector3(0, 1.7, 1));
        this.camera.attachControl(this.engine.inputElement, true);
        this.camera.mode = UniversalCamera.FPS_MODE;
        this.camera.minZ = 0.1;

        // Light
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        // Ground
        const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
        const groundMat = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0.2, 0.3, 0.2);
        ground.material = groundMat;

        // Create some boxes as targets
        for (let i = 0; i < 15; i++) {
            const box = MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
            box.position.x = (Math.random() - 0.5) * 30;
            box.position.z = (Math.random() - 0.5) * 30;
            box.position.y = 0.5 + Math.random() * 2;
            
            const boxMat = new StandardMaterial(`boxMat${i}`, scene);
            boxMat.diffuseColor = new Color3(Math.random(), Math.random(), Math.random());
            box.material = boxMat;
            
            this.boxes.push(box);
        }

        // Shooting mechanic
        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
                this.shoot(scene);
            }
        });

        return scene;
    }

    private shoot(scene: Scene): void {
        if (!this.canShoot) return;
        this.canShoot = false;

        const forward = this.camera.getForwardRay().direction.clone();
        const ray = new Ray(this.camera.position, forward, 100);
        
        const hit = scene.pickWithRay(ray);
        
        if (hit && hit.pickedMesh && hit.pickedMesh.name.startsWith("box")) {
            const boxIndex = this.boxes.findIndex(b => b === hit.pickedMesh);
            if (boxIndex !== -1) {
                const box = this.boxes[boxIndex];
                
                // Create flash effect
                const flash = MeshBuilder.CreateSphere("flash", { diameter: 0.3 }, scene);
                flash.position = hit.pickedPoint || Vector3.Zero();
                const flashMat = new StandardMaterial("flashMat", scene);
                flashMat.emissiveColor = new Color3(1, 1, 0);
                flash.material = flashMat;
                
                setTimeout(() => {
                    flash.dispose();
                }, 100);
                
                // Remove box after 100ms
                setTimeout(() => {
                    if (box.isVisible) {
                        box.dispose();
                        this.boxes.splice(boxIndex, 1);
                    }
                }, 100);
            }
        }

        setTimeout(() => {
            this.canShoot = true;
        }, 150);
    }

    private setupInputs(): void {
        document.addEventListener("keydown", (e) => {
            switch(e.code) {
                case "KeyW": this.moveForward = true; break;
                case "KeyS": this.moveBackward = true; break;
                case "KeyA": this.moveLeft = true; break;
                case "KeyD": this.moveRight = true; break;
            }
        });

        document.addEventListener("keyup", (e) => {
            switch(e.code) {
                case "KeyW": this.moveForward = false; break;
                case "KeyS": this.moveBackward = false; break;
                case "KeyA": this.moveLeft = false; break;
                case "KeyD": this.moveRight = false; break;
            }
        });
    }

    private startRenderLoop(): void {
        this.engine.runRenderLoop(() => {
            // Handle movement
            const forward = this.camera.getForwardRay().direction.clone();
            forward.y = 0;
            forward.normalize();
            
            const right = Vector3.Cross(forward, new Vector3(0, 1, 0)).normalize();

            if (this.moveForward) {
                this.camera.position.addInPlace(forward.scale(this.playerSpeed));
            }
            if (this.moveBackward) {
                this.camera.position.addInPlace(forward.scale(-this.playerSpeed));
            }
            if (this.moveLeft) {
                this.camera.position.addInPlace(right.scale(-this.playerSpeed));
            }
            if (this.moveRight) {
                this.camera.position.addInPlace(right.scale(this.playerSpeed));
            }

            // Keep player at fixed height
            this.camera.position.y = 1.7;

            this.scene.render();
        });
    }

    private setupResizeHandler(): void {
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getEngine(): Engine {
        return this.engine;
    }
}
