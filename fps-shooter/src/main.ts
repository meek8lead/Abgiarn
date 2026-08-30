import { PlayerController } from './PlayerController';
import { EnemyManager } from './EnemyManager';
import { BulletManager } from './BulletManager';
import { Game } from './Game';

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

if (canvas) {
    const game = new Game(canvas);
    game.init();
}
