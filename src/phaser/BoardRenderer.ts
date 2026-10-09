import Phaser from 'phaser';
import type { CellPosition, ContentCatalog, MapId } from '../content/types';
import type { BattleState } from '../domain/types';
import { buildBoardPresentation, OCCUPANT_LAYER } from '../geometry/boardPresentation';
import { CANOPY_ART, UNIT_ART, canopyBounds, canopyOccludes, unitBounds } from '../geometry/canopy';
import { boardBounds, fitBoard, orderTiles, projectTile, tileFaces, TILE_HEIGHT, TILE_WIDTH, type Bounds, type Point, type Tile } from '../geometry/iso';
import { constrainView, MAX_ZOOM, pickTile, screenToBoard, type View } from '../geometry/picking';

const REACHABLE_COLOR = 0x46d7c7;
const ACTIVE_COLOR = 0xffd36a;
const SELECTED_COLOR = 0xffffff;
const cellKey = (cell: CellPosition): string => `${cell.x},${cell.y}`;

/** Draws snapshots and sends selection intent; combat state belongs to BattleScene. */
export class BoardRenderer {
  private readonly root: Phaser.GameObjects.Container;
  private readonly board;
  private readonly byCell;
  private readonly bounds: Bounds;
  private readonly highlights = new Map<string, Phaser.GameObjects.Graphics>();
  private readonly images = new Map<number, Phaser.GameObjects.Image>();
  private readonly rings = new Map<number, Phaser.GameObjects.Graphics>();
  private readonly canopies: { tile: Tile; graphics: Phaser.GameObjects.Graphics }[] = [];
  private readonly surfaces: { tile: Tile; image: Phaser.GameObjects.Image }[] = [];
  private view: View = { x: 0, y: 0, scale: 1 };
  private viewport = { width: 1, height: 1 };
  private panelBottom = 0;
  private fitScale = 1;
  private snapshot: BattleState | undefined;
  private reachable: readonly CellPosition[] = [];
  private selected: Tile | null = null;
  private selectionEvents = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly catalog: ContentCatalog, private readonly mapId: MapId,
    private readonly onSelect: (cell: CellPosition | null) => void) {
    this.board = buildBoardPresentation(catalog, mapId);
    this.byCell = new Map(this.board.tiles.map(tile => [cellKey(tile), tile]));
    this.root = scene.add.container();
    for (const tile of orderTiles(this.board.tiles)) {
      const faces = tileFaces(tile);
      const column = scene.add.graphics().setDepth(tile.depth);
      for (const [points, color] of [[faces.left, 0x354538], [faces.right, 0x4c6050], [faces.top, 0x5b7157]] as const) {
        column.fillStyle(color).fillPoints(points.map(p => new Phaser.Math.Vector2(p.x, p.y)), true);
      }
      const point = projectTile(tile);
      const surface = scene.add.container(point.x, point.y).setScale(1, TILE_HEIGHT / TILE_WIDTH).setDepth(tile.depth + 1);
      const image = scene.add.image(0, 0, tile.surfaceAssetId).setOrigin(0.5)
        .setDisplaySize(TILE_WIDTH / Math.SQRT2, TILE_WIDTH / Math.SQRT2).setRotation(Math.PI / 4);
      surface.add(image);
      this.surfaces.push({ tile, image });
      const highlight = scene.add.graphics().setDepth(tile.depth + 2);
      this.highlights.set(cellKey(tile), highlight);
      this.root.add([column, surface, highlight]);
      if (tile.terrain === 'forest') {
        const trunk = scene.add.graphics().setDepth(tile.depth + OCCUPANT_LAYER);
        trunk.fillStyle(0x63452d).fillRect(point.x - 4, point.y - 40, 8, 40);
        const foliage = scene.add.graphics().setDepth(tile.depth + OCCUPANT_LAYER);
        // Vector foliage shares the pure occlusion bounds and needs no new art assets.
        foliage.fillStyle(0x183f30).fillEllipse(point.x, point.y - 50, CANOPY_ART.radius * 2, 64);
        foliage.fillStyle(0x2b6641).fillEllipse(point.x - 8, point.y - 55, 34, 42);
        foliage.fillStyle(0x3b7e4b).fillEllipse(point.x + 8, point.y - 61, 30, 35);
        this.root.add([trunk, foliage]);
        this.canopies.push({ tile, graphics: foliage });
      }
    }
    for (const occupant of this.board.occupants) {
      const asset = catalog.assets[occupant.assetId];
      const image = scene.add.image(0, 0, occupant.assetId)
        .setOrigin(occupant.anchor.x / asset.runtimeWidth, occupant.anchor.y / asset.runtimeHeight)
        .setDisplaySize(UNIT_ART.width, UNIT_ART.height);
      const ring = scene.add.graphics();
      this.images.set(occupant.id, image);
      this.rings.set(occupant.id, ring);
      this.root.add([ring, image]);
    }
    // Reserve sprite space on every cell so moving never escapes the fitted bounds.
    const rectangles = [boardBounds(this.board.tiles), ...this.canopies.map(({ tile }) => canopyBounds(tile)),
      ...this.board.tiles.flatMap(tile => this.board.occupants.map(occupant => {
        const asset = catalog.assets[occupant.assetId];
        return unitBounds(tile, { x: occupant.anchor.x / asset.runtimeWidth, y: occupant.anchor.y / asset.runtimeHeight });
      }))];
    this.bounds = {
      left: Math.min(...rectangles.map(r => r.left)), right: Math.max(...rectangles.map(r => r.right)),
      top: Math.min(...rectangles.map(r => r.top)), bottom: Math.max(...rectangles.map(r => r.bottom)),
    };
  }

  present(snapshot: BattleState, reachable: readonly CellPosition[], selected: CellPosition | null): void {
    this.snapshot = snapshot;
    this.reachable = reachable;
    this.selected = selected ? this.byCell.get(cellKey(selected)) ?? null : null;
    const activeId = snapshot.initiative[snapshot.activeIndex];
    const active = snapshot.units.find(unit => unit.id === activeId)!;
    const reachableKeys = new Set(reachable.map(cellKey));
    for (const tile of this.board.tiles) {
      const graphics = this.highlights.get(cellKey(tile))!.clear();
      const vertices = tileFaces(tile).top.map(p => new Phaser.Math.Vector2(p.x, p.y));
      graphics.lineStyle(0.8, 0x17291f, 0.6).strokePoints(vertices, true);
      if (reachableKeys.has(cellKey(tile)) && cellKey(tile) !== cellKey(active.cell)) {
        graphics.fillStyle(REACHABLE_COLOR, 0.26).fillPoints(vertices, true);
        graphics.lineStyle(1.5, REACHABLE_COLOR, 0.85).strokePoints(vertices, true);
      }
      if (cellKey(tile) === cellKey(active.cell)) graphics.lineStyle(3, ACTIVE_COLOR).strokePoints(vertices, true);
      if (this.selected === tile) {
        const point = projectTile(tile);
        const inset = vertices.map(p => new Phaser.Math.Vector2(point.x + (p.x - point.x) * 0.78, point.y + (p.y - point.y) * 0.78));
        graphics.lineStyle(2.5, SELECTED_COLOR).strokePoints(inset, true);
      }
    }
    for (const unit of snapshot.units) {
      const tile = this.byCell.get(cellKey(unit.cell))!;
      const point = projectTile(tile);
      const depth = tile.depth;
      this.images.get(unit.id)!.setPosition(point.x, point.y).setDepth(depth + OCCUPANT_LAYER).setVisible(unit.hp > 0);
      const ring = this.rings.get(unit.id)!.clear().setDepth(depth + 2.25).setVisible(unit.hp > 0);
      ring.lineStyle(unit.id === activeId ? 3 : 2, unit.id === activeId ? ACTIVE_COLOR : unit.side === 'player' ? 0x6ddbf5 : 0xf17a73)
        .strokeEllipse(point.x, point.y, 26, 12);
    }
    for (const canopy of this.canopies) {
      const overlaps = snapshot.units.some(unit => {
        if (unit.hp <= 0) return false;
        const tile = this.byCell.get(cellKey(unit.cell))!;
        const image = this.images.get(unit.id)!;
        return canopyOccludes(canopy.tile, tile, unitBounds(tile, { x: image.originX, y: image.originY }), this.catalog.maps[this.mapId].height);
      });
      canopy.graphics.setAlpha(overlaps ? CANOPY_ART.fadedAlpha : 1);
    }
    this.root.sort('depth');
    this.publish();
  }

  fit(width: number, height: number, panelBottom: number): void {
    const layout = fitBoard(this.bounds, { width, height }, panelBottom);
    const zoom = this.view.scale / this.fitScale;
    this.viewport = { width, height };
    this.panelBottom = panelBottom;
    this.fitScale = layout.scale;
    this.applyView({ ...layout, scale: layout.scale * zoom });
  }

  private applyView(view: View): void {
    this.view = constrainView(view, this.bounds, this.viewport, this.panelBottom, this.fitScale);
    this.root.setPosition(this.view.x, this.view.y).setScale(this.view.scale);
    this.publish();
  }

  pan(dx: number, dy: number): void { this.applyView({ ...this.view, x: this.view.x + dx, y: this.view.y + dy }); }

  zoom(factor: number, anchor: Point): void {
    const point = screenToBoard(anchor, this.view);
    const scale = Math.max(this.fitScale, Math.min(this.fitScale * MAX_ZOOM, this.view.scale * factor));
    this.applyView({ x: anchor.x - point.x * scale, y: anchor.y - point.y * scale, scale });
  }

  select(point: Point): void {
    this.selectionEvents++;
    const tile = pickTile(this.board.tiles, screenToBoard(point, this.view));
    this.onSelect(tile ? { x: tile.x, y: tile.y } : null);
  }

  private publish(): void {
    if (!this.snapshot) return;
    const matrix = this.root.getWorldTransformMatrix();
    const surfaceErrors = this.surfaces.flatMap(({ tile, image }) => {
      const half = image.width / 2;
      const corners = [{ x: -half, y: -half }, { x: half, y: -half }, { x: half, y: half }, { x: -half, y: half }];
      return tileFaces(tile).top.map((point, i) => {
        const expected = matrix.transformPoint(point.x, point.y);
        const actual = image.getWorldTransformMatrix().transformPoint(corners[i].x, corners[i].y);
        return Math.hypot(actual.x - expected.x, actual.y - expected.y);
      });
    });
    const units = this.snapshot.units.map(unit => {
      const image = this.images.get(unit.id)!;
      const tile = this.byCell.get(cellKey(unit.cell))!;
      const projected = projectTile(tile);
      const expected = matrix.transformPoint(projected.x, projected.y);
      const actual = image.getWorldTransformMatrix().transformPoint(0, 0);
      return { id: unit.id, unitId: unit.defId, side: unit.side, tile: { ...unit.cell, elevation: tile.elevation },
        assetId: image.texture.key, origin: { x: image.originX, y: image.originY }, depth: image.depth,
        position: { x: image.x, y: image.y }, anchorError: Math.hypot(expected.x - actual.x, expected.y - actual.y) };
    });
    const { x, y, scale } = this.view;
    document.querySelector<HTMLElement>('#game')!.dataset.battleReport = JSON.stringify({
      viewport: this.viewport, transform: this.view, tiles: this.board.tiles, units,
      activeId: this.snapshot.initiative[this.snapshot.activeIndex], commandCount: this.snapshot.commandCount,
      reachable: this.reachable, selected: this.selected ? { x: this.selected.x, y: this.selected.y, elevation: this.selected.elevation } : null,
      selectionEvents: this.selectionEvents, objectCount: this.scene.children.length + this.root.length + this.surfaces.length,
      depthOrder: this.root.list.map(object => Number('depth' in object ? object.depth : 0)),
      surfaceCornerError: Math.max(...surfaceErrors),
      canopies: this.canopies.map(({ tile, graphics }) => ({ tile, depth: graphics.depth, alpha: graphics.alpha })),
      bounds: { left: x + this.bounds.left * scale, right: x + this.bounds.right * scale,
        top: y + this.bounds.top * scale, bottom: y + this.bounds.bottom * scale },
    });
  }
}
