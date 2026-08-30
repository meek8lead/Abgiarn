import { FPSGame } from './modules/game';

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Initialize the game
const game = new FPSGame({ canvas });

console.log("FPS Game initialized!");
