import Phaser from 'phaser';
import { BOARD_FIXTURE } from '../diagnostics/boardFixture';
import { PROOF_ASSETS, PROOF_ART, PROOF_FIXTURES, proofDepth, type ProofFixture } from '../diagnostics/proofAssets';
import { setProofDiagnostics, type BoardDiagnostics } from '../diagnostics/browser';
import { boardBounds, fitBoard, orderTiles, projectTile, tileFaces, type Point, type Bounds, type Tile, TILE_WIDTH, TILE_HEIGHT } from '../geometry/iso';

const ELEVATED_EDGE_COLOR = 0x263c29;
const ELEVATED_EDGE_WIDTH = 1;
const OCCUPANT_LAYER = 2.5;
const OCCLUDING_TREE_ALPHA = 0.4;

export class BoardRenderer {
  private readonly root: Phaser.GameObjects.Container;
  private readonly hero: Phaser.GameObjects.Image;
  private readonly prop: Phaser.GameObjects.Image;
  private readonly bounds: Bounds;
  private fixture: ProofFixture = 'ground-behind';
  private readonly surfaces: { tile: Tile; image: Phaser.GameObjects.Image }[] = [];
  private readonly surfaceMasks: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.root = scene.add.container();
    const surfaceSide = (TILE_WIDTH + PROOF_ART.grass.horizontalBleed * 2) / Math.SQRT2;
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
      const surface = scene.add.container(point.x, point.y)
        .setScale(1, TILE_HEIGHT / TILE_WIDTH).setDepth(proofDepth(tile, 1));
      const grass = scene.add.image(0, 0, 'grass').setOrigin(0.5)
        .setDisplaySize(surfaceSide, surfaceSide).setRotation(Math.PI / 4);
      surface.add(grass);
      this.surfaces.push({ tile, image: grass });
      // Rotate a square by exactly 45 degrees, then squash vertically to the grid's 2:1 diamond.
      const mask = scene.add.graphics().setVisible(false);
      mask.fillStyle(0xffffff).fillPoints(faces.top.map(vertex => new Phaser.Math.Vector2(vertex.x, vertex.y)), true);
      grass.setMask(mask.createGeometryMask());
      this.surfaceMasks.push(mask);
      this.root.add([graphics, surface]);
      if (tile.elevation > 0) {
        const border = scene.add.graphics().setDepth(proofDepth(tile, 2));
        border.lineStyle(ELEVATED_EDGE_WIDTH, ELEVATED_EDGE_COLOR, 0.95)
          .strokePoints(faces.top.map(vertex => new Phaser.Math.Vector2(vertex.x, vertex.y)), true);
        this.root.add(border);
      }
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
    this.fixture = fixture;
    const value = PROOF_FIXTURES[fixture];
    const hero = projectTile(value.hero);
    const prop = projectTile(value.prop);
    this.hero.setPosition(hero.x + value.heroOffsetX, hero.y).setDepth(proofDepth(value.hero, OCCUPANT_LAYER));
    this.prop.setPosition(prop.x, prop.y).setDepth(proofDepth(value.prop, OCCUPANT_LAYER));
    const occludesHero = this.hero.depth < this.prop.depth
      && Phaser.Geom.Rectangle.Overlaps(this.hero.getBounds(), this.prop.getBounds());
    this.prop.setAlpha(occludesHero ? OCCLUDING_TREE_ALPHA : 1);
    this.root.sort('depth');
    this.publishDiagnostics();
  }

  private publishDiagnostics(): void {
    const value = PROOF_FIXTURES[this.fixture];
    const rootMatrix = this.root.getWorldTransformMatrix();
    const bleedScale = (TILE_WIDTH + PROOF_ART.grass.horizontalBleed * 2) / TILE_WIDTH;
    const errors = this.surfaces.flatMap(({ tile, image }) => {
      const halfWidth = image.width / 2 / bleedScale;
      const halfHeight = image.height / 2 / bleedScale;
      const corners = [
        { x: -halfWidth, y: -halfHeight }, { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight }, { x: -halfWidth, y: halfHeight },
      ];
      const matrix = image.getWorldTransformMatrix();
      return tileFaces(tile).top.map((point, index) => {
        const expected = rootMatrix.transformPoint(point.x, point.y);
        const actual = matrix.transformPoint(corners[index].x, corners[index].y);
        return Math.hypot(expected.x - actual.x, expected.y - actual.y);
      });
    });
    setProofDiagnostics({ fixture: this.fixture, relation: value.relation, propElevation: value.prop.elevation,
      heroDepth: this.hero.depth, propDepth: this.prop.depth, propAlpha: this.prop.alpha, assetCount: PROOF_ASSETS.length,
      surfaceCornerError: Math.max(...errors),
      objectCount: this.root.length + 1 + this.surfaceMasks.length + this.surfaces.length });
  }

  fit(width: number, height: number, panelBottom: number): BoardDiagnostics {
    const layout = fitBoard(this.bounds, { width, height }, panelBottom);
    this.root.setPosition(layout.x, layout.y).setScale(layout.scale);
    for (const mask of this.surfaceMasks) mask.setPosition(layout.x, layout.y).setScale(layout.scale);
    this.publishDiagnostics();
    return {
      tileCount: BOARD_FIXTURE.length,
      elevations: [...new Set(BOARD_FIXTURE.map(tile => tile.elevation))].sort(),
      scale: layout.scale,
      bounds: { left: layout.x + this.bounds.left * layout.scale, right: layout.x + this.bounds.right * layout.scale,
        top: layout.y + this.bounds.top * layout.scale, bottom: layout.y + this.bounds.bottom * layout.scale },
    };
  }
}
