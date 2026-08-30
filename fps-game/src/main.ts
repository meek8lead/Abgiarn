import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Ray } from "@babylonjs/core/Culling/ray";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);

const createScene = () => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.1, 0.1, 0.2, 1);

    // Camera (FPS view)
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 0;
    camera.upperRadiusLimit = 0;
    camera.wheelPrecision = 0;
    
    // Light
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Ground
    const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(0.2, 0.3, 0.2);
    ground.material = groundMat;

    // Create some boxes as targets
    const boxes: any[] = [];
    for (let i = 0; i < 10; i++) {
        const box = MeshBuilder.CreateBox(`box${i}`, { size: 1 }, scene);
        box.position.x = (Math.random() - 0.5) * 30;
        box.position.z = (Math.random() - 0.5) * 30;
        box.position.y = 0.5;
        
        const boxMat = new StandardMaterial(`boxMat${i}`, scene);
        boxMat.diffuseColor = new Color3(Math.random(), Math.random(), Math.random());
        box.material = boxMat;
        
        boxes.push(box);
    }

    // Shooting mechanic
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
            // Create a ray from the camera
            const ray = new Ray(camera.position, camera.getForwardRay().direction, 100);
            
            // Check for intersection with boxes
            const hit = scene.pickWithRay(ray);
            
            if (hit && hit.pickedMesh && hit.pickedMesh.name.startsWith("box")) {
                // Remove the hit box
                hit.pickedMesh.dispose();
                
                // Create a simple flash effect
                const flash = MeshBuilder.CreateSphere("flash", { diameter: 0.5 }, scene);
                flash.position = hit.pickedPoint || Vector3.Zero();
                const flashMat = new StandardMaterial("flashMat", scene);
                flashMat.emissiveColor = new Color3(1, 1, 0);
                flash.material = flashMat;
                
                setTimeout(() => flash.dispose(), 100);
            }
        }
    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
