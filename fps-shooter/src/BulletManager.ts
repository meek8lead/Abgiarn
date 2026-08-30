import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

interface Bullet {
    mesh: any;
    velocity: Vector3;
    createdAt: number;
    lifetime: number;
}

export class BulletManager {
    private scene: Scene;
    private bullets: Bullet[] = [];
    private bulletSpeed: number = 50;
    private bulletLifetime: number = 3000; // ms

    constructor(scene: Scene) {
        this.scene = scene;
        
        // Register observer for shooting
        this.scene.on("playerShoot", (data: any) => {
            if (data && data.position && data.direction) {
                this.createBullet(data.position, data.direction);
            }
        });
    }

    public createBullet(position: Vector3, direction: Vector3): void {
        const bullet = MeshBuilder.CreateSphere("bullet", { diameter: 0.2 }, this.scene);
        const bulletMat = new StandardMaterial("bulletMat", this.scene);
        bulletMat.diffuseColor = new Color3(1, 1, 0);
        bulletMat.emissiveColor = new Color3(1, 0.5, 0);
        bullet.material = bulletMat;
        
        bullet.position = position.clone();
        
        this.bullets.push({
            mesh: bullet,
            velocity: direction.scale(this.bulletSpeed),
            createdAt: Date.now(),
            lifetime: this.bulletLifetime
        });
    }

    public update(): void {
        const now = Date.now();
        const deltaTime = 0.016; // Approximate frame time

        // Update bullets and remove old ones
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Move bullet
            bullet.mesh.position.addInPlace(bullet.velocity.scale(deltaTime));
            
            // Check lifetime
            if (now - bullet.createdAt > bullet.lifetime) {
                this.removeBullet(i);
                continue;
            }
            
            // Check if bullet is too far
            if (bullet.mesh.position.length() > 500) {
                this.removeBullet(i);
            }
        }
    }

    private removeBullet(index: number): void {
        const bullet = this.bullets[index];
        if (bullet && bullet.mesh) {
            bullet.mesh.dispose();
        }
        this.bullets.splice(index, 1);
    }

    public checkCollision(position: Vector3, radius: number): boolean {
        for (const bullet of this.bullets) {
            const distance = Vector3.Distance(bullet.mesh.position, position);
            if (distance < radius + 0.1) { // 0.1 is bullet radius
                return true;
            }
        }
        return false;
    }
}
