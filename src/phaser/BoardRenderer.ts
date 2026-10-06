import Phaser from 'phaser';
import { BOARD_FIXTURE } from '../diagnostics/boardFixture';
import type { BoardDiagnostics } from '../diagnostics/browser';
import { boardBounds, fitBoard, orderTiles, tileFaces, type Point } from '../geometry/iso';

const TOP_COLORS = [0x638b82, 0x84aa8a, 0xb3cb97] as const;
const LEFT_COLOR = 0x3b535e;
const RIGHT_COLOR = 0x4e6d72;
const EDGE_COLOR = 0x203844;

export class BoardRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly bounds = boardBounds(BOARD_FIXTURE);

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    const drawFace = (points: readonly Point[], color: number): void => {
      const vertices = points.map(point => new Phaser.Math.Vector2(point.x, point.y));
      this.graphics.fillStyle(color, 1).fillPoints(vertices, true);
      this.graphics.lineStyle(1, EDGE_COLOR, 1).strokePoints(vertices, true);
    };
    for (const tile of orderTiles(BOARD_FIXTURE)) {
      const faces = tileFaces(tile);
      drawFace(faces.left, LEFT_COLOR);
      drawFace(faces.right, RIGHT_COLOR);
      drawFace(faces.top, TOP_COLORS[tile.elevation]);
    }
  }

  fit(width: number, height: number, panelBottom: number): BoardDiagnostics {
    const layout = fitBoard(this.bounds, { width, height }, panelBottom);
    this.graphics.setPosition(layout.x, layout.y).setScale(layout.scale);
    return {
      tileCount: BOARD_FIXTURE.length,
      elevations: [...new Set(BOARD_FIXTURE.map(tile => tile.elevation))].sort(),
      scale: this.graphics.scaleX,
      bounds: {
        left: this.graphics.x + this.bounds.left * this.graphics.scaleX,
        right: this.graphics.x + this.bounds.right * this.graphics.scaleX,
        top: this.graphics.y + this.bounds.top * this.graphics.scaleY,
        bottom: this.graphics.y + this.bounds.bottom * this.graphics.scaleY,
      },
    };
  }
}
