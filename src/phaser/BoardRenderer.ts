import Phaser from 'phaser';
import { BOARD_FIXTURE } from '../diagnostics/boardFixture';
import { PROOF_ASSETS, PROOF_ART, PROOF_FIXTURES, proofDepth, type ProofFixture } from '../diagnostics/proofAssets';
import { setProofDiagnostics, type BoardDiagnostics } from '../diagnostics/browser';
import { boardBounds, fitBoard, orderTiles, projectTile, tileFaces, type Point, type Bounds } from '../geometry/iso';

export class BoardRenderer {
  private readonly root: Phaser.GameObjects.Container;
  private readonly hero: Phaser.GameObjects.Image;
  private readonly prop: Phaser.GameObjects.Image;
  private readonly bounds: Bounds;

  constructor(scene: Phaser.Scene) {
    this.root = scene.add.container();
    const drawFace = (graphics: Phaser.GameObjects.Graphics, points: readonly Point[], color: number): void => {
      const vertices = points.map(point => new Phaser.Math.Vector2(point.x, point.y));
      graphics.fillStyle(color, 1).fillPoints(vertices, true);
      graphics.lineStyle(1, 0x203844, 1).strokePoints(vertices, true);
    };
    for (const tile of orderTiles(BOARD_FIXTURE)) {
      const graphics = scene.add.graphics().setDepth(proofDepth(tile, 0));
      const faces = tileFaces(tile);
      drawFace(graphics, faces.left, 0x3b535e);
      drawFace(graphics, faces.right, 0x4e6d72);
      drawFace(graphics, faces.top, 0x638b82);
      const point = projectTile(tile);
      const grass = scene.add.image(point.x, point.y, 'grass')
        .setOrigin(0.5, PROOF_ART.grass.originY).setDisplaySize(PROOF_ART.grass.width, PROOF_ART.grass.height)
        .setCrop(PROOF_ART.grass.crop.x, PROOF_ART.grass.crop.y, PROOF_ART.grass.crop.width, PROOF_ART.grass.crop.height).setDepth(proofDepth(tile, 1));
      this.root.add([graphics, grass]);
    }
    this.prop = scene.add.image(0, 0, 'tree').setOrigin(0.5, PROOF_ART.tree.originY).setDisplaySize(PROOF_ART.tree.width, PROOF_ART.tree.height);
    this.hero = scene.add.image(0, 0, 'fighter').setOrigin(0.5, PROOF_ART.fighter.originY).setDisplaySize(PROOF_ART.fighter.width, PROOF_ART.fighter.height);
    this.root.add([this.prop, this.hero]);
    // Include every fixture and the full art rectangles (even transparent padding).
    const bounds = boardBounds(BOARD_FIXTURE);
    const rectangles = Object.keys(PROOF_FIXTURES).map(fixture => {
      this.showFixture(fixture as ProofFixture);
      return this.root.getBounds();
    });
    this.bounds = {
      left: Math.min(bounds.left, ...rectangles.map(rect => rect.left)),
      top: Math.min(bounds.top, ...rectangles.map(rect => rect.top)),
      right: Math.max(bounds.right, ...rectangles.map(rect => rect.right)),
      bottom: Math.max(bounds.bottom, ...rectangles.map(rect => rect.bottom)),
    };
    this.showFixture('ground-behind');
  }

  showFixture(fixture: ProofFixture): void {
    const value = PROOF_FIXTURES[fixture];
    const hero = projectTile(value.hero);
    const prop = projectTile(value.prop);
    this.hero.setPosition(hero.x + value.heroOffsetX, hero.y).setDepth(proofDepth(value.hero, 2));
    this.prop.setPosition(prop.x, prop.y).setDepth(proofDepth(value.prop, 2));
    this.root.sort('depth');
    setProofDiagnostics({ fixture, relation: value.relation, propElevation: value.prop.elevation,
      heroDepth: this.hero.depth, propDepth: this.prop.depth, assetCount: PROOF_ASSETS.length, objectCount: this.root.length + 1 });
  }

  fit(width: number, height: number, panelBottom: number): BoardDiagnostics {
    const layout = fitBoard(this.bounds, { width, height }, panelBottom);
    this.root.setPosition(layout.x, layout.y).setScale(layout.scale);
    return {
      tileCount: BOARD_FIXTURE.length,
      elevations: [...new Set(BOARD_FIXTURE.map(tile => tile.elevation))].sort(),
      scale: layout.scale,
      bounds: { left: layout.x + this.bounds.left * layout.scale, right: layout.x + this.bounds.right * layout.scale,
        top: layout.y + this.bounds.top * layout.scale, bottom: layout.y + this.bounds.bottom * layout.scale },
    };
  }
}
