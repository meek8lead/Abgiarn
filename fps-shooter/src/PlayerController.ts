import { Camera } from "@babylonjs/core/Cameras/camera";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PhysicsAggregate } from "@babylonjs/core/Collisions/physicsAggregate";
import { ShapeType } from "@babylonjs/core/Collisions/physicsShape";

export class PlayerController {
    private camera: Camera;
    private scene: Scene;
    private canvas: HTMLCanvasElement;
    
    // Movement state
    private moveForward: boolean = false;
    private moveBackward: boolean = false;
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private isRunning: boolean = false;
    
    // Player properties
    private speed: number = 5;
    private runMultiplier: number = 1.8;
    private velocity: Vector3 = Vector3.Zero();
    private position: Vector3 = new Vector3(0, 2, 0);
    
    // Health and ammo
    private health: number = 100;
    private maxHealth: number = 100;
    private ammo: number = 30;
    private maxAmmo: number = 30;
    private isReloading: boolean = false;
    
    // Shooting
    private isShooting: boolean = false;
    private lastShotTime: number = 0;
    private fireRate: number = 100; // ms between shots
    
    // Weapon mesh
    private weaponMesh: any;

    constructor(camera: Camera, scene: Scene, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.scene = scene;
        this.canvas = canvas;
        
        this.setupInputs();
        this.createWeapon();
        this.updateUI();
    }

    private setupInputs(): void {
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveForward = true; break;
                case 'KeyS': this.moveBackward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyD': this.moveRight = true; break;
                case 'ShiftLeft': 
                case 'ShiftRight': 
                    this.isRunning = true; 
                    break;
                case 'KeyR': this.reload(); break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'KeyW': this.moveForward = false; break;
                case 'KeyS': this.moveBackward = false; break;
                case 'KeyA': this.moveLeft = false; break;
                case 'KeyD': this.moveRight = false; break;
                case 'ShiftLeft': 
                case 'ShiftRight': 
                    this.isRunning = false; 
                    break;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isShooting = true;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isShooting = false;
            }
        });
    }

    private createWeapon(): void {
        // Create a simple gun model
        this.weaponMesh = MeshBuilder.CreateBox("weapon", { width: 0.3, height: 0.3, depth: 1 }, this.scene);
        const weaponMat = new StandardMaterial("weaponMat", this.scene);
        weaponMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
        this.weaponMesh.material = weaponMat;
        
        // Attach weapon to camera
        this.weaponMesh.parent = this.camera as any;
        this.weaponMesh.position = new Vector3(0.3, -0.3, 0.5);
    }

    public update(): void {
        // Handle shooting
        if (this.isShooting && !this.isReloading) {
            const now = Date.now();
            if (now - this.lastShotTime > this.fireRate && this.ammo > 0) {
                this.shoot();
                this.lastShotTime = now;
            } else if (this.ammo <= 0) {
                this.reload();
            }
        }

        // Calculate movement direction
        const currentSpeed = this.speed * (this.isRunning ? this.runMultiplier : 1);
        const moveDirection = Vector3.Zero();

        if (this.moveForward) moveDirection.addInPlace(this.getForwardDirection());
        if (this.moveBackward) moveDirection.subtractInPlace(this.getForwardDirection());
        if (this.moveLeft) moveDirection.addInPlace(this.getLeftDirection());
        if (this.moveRight) moveDirection.subtractInPlace(this.getLeftDirection());

        // Normalize and apply speed
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            moveDirection.scaleInPlace(currentSpeed * 0.016); // Frame time approximation
            
            // Update position
            this.position.addInPlace(moveDirection);
            
            // Keep player on ground
            this.position.y = 2;
            
            // Update camera position
            this.camera.position = this.position.clone();
        }

        // Update UI periodically
        this.updateUI();
    }

    private getForwardDirection(): Vector3 {
        const forward = this.camera.getForwardDirection(new Vector3(0, 1, 0));
        forward.y = 0;
        forward.normalize();
        return forward;
    }

    private getLeftDirection(): Vector3 {
        const forward = this.getForwardDirection();
        const left = new Vector3(-forward.z, 0, forward.x);
        left.normalize();
        return left;
    }

    private shoot(): void {
        this.ammo--;
        
        // Simple recoil effect
        this.weaponMesh.position.z += 0.1;
        setTimeout(() => {
            if (this.weaponMesh) {
                this.weaponMesh.position.z -= 0.1;
            }
        }, 50);

        // Emit shoot event for bullet manager
        const shootEvent = {
            position: this.camera.position.clone(),
            direction: this.getForwardDirection()
        };
        
        this.scene.trigger("playerShoot", shootEvent);
    }

    private reload(): void {
        if (this.isReloading || this.ammo === this.maxAmmo) return;
        
        this.isReloading = true;
        this.updateUI();
        
        // Simple reload animation
        if (this.weaponMesh) {
            this.weaponMesh.rotation.x = -Math.PI / 4;
        }
        
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            if (this.weaponMesh) {
                this.weaponMesh.rotation.x = 0;
            }
            this.updateUI();
        }, 1500);
    }

    public takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.onDeath();
        }
        this.updateUI();
    }

    private onDeath(): void {
        // Game over logic handled by Game class
        const gameOverEvent = { playerDied: true };
        this.scene.trigger("playerDeath", gameOverEvent);
    }

    public getPosition(): Vector3 {
        return this.position.clone();
    }

    private updateUI(): void {
        const healthEl = document.getElementById('health');
        const ammoEl = document.getElementById('ammo');
        
        if (healthEl) healthEl.textContent = Math.ceil(this.health).toString();
        if (ammoEl) ammoEl.textContent = this.isReloading ? "RELOADING" : this.ammo.toString();
    }

    public getHealth(): number {
        return this.health;
    }
}
