import Phaser from 'phaser';
import type { DesertLandmark } from '../geometry/boardPresentation';

/** Compact silhouettes leave the tile edges and movement overlays visible. */
export function drawDesertLandmark(graphics: Phaser.GameObjects.Graphics, landmark: DesertLandmark): void {
  const face = (color: number, points: readonly (readonly [number, number])[]) =>
    graphics.fillStyle(color).fillPoints(points.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);

  graphics.fillStyle(0x39271d, 0.52).fillEllipse(0, 5, 49, 18);
  if (landmark === 'cactus') {
    const arms = [[-12, -20], [-12, -12], [-7, -7], [7, -7], [13, -13], [13, -19]];
    graphics.lineStyle(9, 0x1c392b).strokePoints(arms.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    graphics.lineStyle(5, 0x4f8c58).strokePoints(arms.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    graphics.fillStyle(0x1c392b).fillRoundedRect(-6, -30, 12, 36, 5);
    graphics.fillStyle(0x559765).fillRoundedRect(-4, -28, 8, 32, 3);
    graphics.lineStyle(1.5, 0x9ac07b).lineBetween(-1, -24, -1, -4);
    face(0x82513a, [[-18, 5], [-14, 0], [-7, -1], [-3, 5], [-10, 9]]);
    face(0xc58a5b, [[-18, 5], [-14, 0], [-7, -1], [-9, 4]]);
    face(0x82513a, [[6, 8], [10, 2], [18, 1], [22, 6], [16, 11]]);
    face(0xd4a171, [[6, 8], [10, 2], [18, 1], [16, 6]]);
    return;
  }

  face(0x52392d, [[-24, 3], [-18, -12], [-7, -23], [9, -21], [23, -9], [26, 4], [9, 13], [-12, 12]]);
  face(0xca9769, [[-21, 2], [-16, -11], [-6, -21], [8, -19], [2, -10], [-8, -6]]);
  face(0x996748, [[-21, 2], [-8, -6], [2, -10], [5, -2], [9, 11], [-11, 10]]);
  face(0x75503a, [[8, -19], [21, -8], [24, 3], [9, 11], [5, -2], [2, -10]]);
  graphics.lineStyle(1.5, 0xe2b080, 0.75).lineBetween(-15, -9, -3, -15);
}
