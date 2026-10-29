import Phaser from 'phaser';
import type { CellPosition, ContentCatalog, MapId } from '../content/types';
import type { BattleEvent, BattleState } from '../domain/types';
import { guardedEffect } from '../domain/effects';
import { buildBoardPresentation, OCCUPANT_LAYER } from '../geometry/boardPresentation';
import { CANOPY_ART, UNIT_ART, canopyBounds, canopyOccludes, unitBounds } from '../geometry/canopy';
import { boardBounds, fitBoard, orderTiles, projectTile, tileFaces, BASE_THICKNESS, ELEVATION_STEP, MAX_BOARD_SCALE, TILE_HEIGHT, TILE_WIDTH, type BoardRegion, type Bounds, type Point, type Tile } from '../geometry/iso';
import { constrainView, DRAG_THRESHOLD, MAX_ZOOM, pickTileCandidates, screenToBoard, type View } from '../geometry/picking';
import { HEALTH_BAR, HEALTH_COLORS, healthArc, healthBarScale, healthColor, healthFraction } from './healthBar';
import { abilityPresentation, type SignatureKind } from './abilityPresentation';
import type { TargetOverlay, HoverPreview } from '../ui/targetPreview';

const REACHABLE_COLOR = 0x46d7c7;
const ACTIVE_COLOR = 0xffd36a;
const SELECTED_COLOR = 0xffffff;
const BOB_HEIGHT = 2;
const BOB_CYCLE_MS = 1200;
const cellKey = (cell: CellPosition): string => `${cell.x},${cell.y}`;

/** Draws snapshots and sends selection intent; combat state belongs to BattleScene. */
export class BoardRenderer {
  private readonly root: Phaser.GameObjects.Container;
  private readonly board;
  private readonly byCell;
  private readonly bounds: Bounds;
  private readonly highlights = new Map<string, Phaser.GameObjects.Image>();
  private readonly images = new Map<number, Phaser.GameObjects.Image>();
  private readonly healthBars = new Map<number, Phaser.GameObjects.Graphics>();
  private readonly guardBadges = new Map<number, Phaser.GameObjects.Graphics>();
  private moving: { unitId: number; point: Point; depth: number } | null = null;
  private readonly rings = new Map<number, Phaser.GameObjects.Graphics>();
  private readonly canopies: { tile: Tile; graphics: Phaser.GameObjects.Graphics }[] = [];
  private readonly surfaces: { tile: Tile; image: Phaser.GameObjects.Image }[] = [];
  private view: View = { x: 0, y: 0, scale: 1 };
  private viewport = { width: 1, height: 1 };
  private region: BoardRegion = { x: 0, y: 0, width: 1, height: 1 };
  private fitScale = 1;
  private snapshot: BattleState | undefined;
  private reachable: readonly CellPosition[] = [];
  private targets: readonly TargetOverlay[] = [];
  private hoverPreview: HoverPreview | null = null;
  private selected: Tile | null = null;
  private selectionEvents = 0;
  private picking: { point: Point; keys: string; index: number } | null = null;
  private animatedSnapshot: BattleState | undefined;
  private effect: { kind: SignatureKind; actorId: number; targetId: number; progress: number;
    from: Point; to: Point; feedback: {unitId: number; text: string; x: number; y: number; visible: boolean}[] } | null = null;
  private effectLabels: {text: Phaser.GameObjects.Text; anchor: Point; kind: 'result'|'defeat'|'guard'}[] = [];

  private idle = false;
  private bobId: number | null = null;
  private bobElapsed = 0;
  private bobOffset = 0;
  private bobBase: Point | null = null;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Absolute offsets from the authoritative tile anchor never accumulate across refreshes. */
  private readonly updateBob = (_time: number, delta: number): void => {
    if (this.bobId === null) return;
    this.bobElapsed = (this.bobElapsed + delta) % BOB_CYCLE_MS;
    this.bobOffset = -BOB_HEIGHT * (1 - Math.cos(2 * Math.PI * this.bobElapsed / BOB_CYCLE_MS)) / 2;
    this.placeBob();
    // Update only the changing sprite diagnostics, not all board geometry each frame.
    const game = document.querySelector<HTMLElement>('#game');
    if (!game?.dataset.battleReport) return;
    const report = JSON.parse(game.dataset.battleReport);
    const unit = report.units.find((u: { id: number }) => u.id === this.bobId);
    if (unit) {
      const image = this.images.get(this.bobId)!;
      unit.position = { x: image.x, y: image.y };
      unit.bobOffset = this.bobOffset;
      const base = this.root.getWorldTransformMatrix().transformPoint(this.bobBase!.x, this.bobBase!.y);
      const actual = image.getWorldTransformMatrix().transformPoint(0, 0);
      unit.baseAnchorError = Math.hypot(base.x - actual.x, base.y - actual.y);
      unit.anchorError = Math.hypot(base.x - actual.x, base.y + this.bobOffset * this.view.scale - actual.y);
    }
    game.dataset.battleReport = JSON.stringify(report);
  };
  private readonly motionChanged = (): void => {
    this.syncBob();
    this.publish();
  };

  setIdle(idle: boolean): void {
    this.idle = idle;
    this.syncBob();
  }

  private syncBob(): void {
    const snapshot = this.snapshot;
    const activeId = snapshot?.initiative[snapshot.activeIndex];
    const active = snapshot?.units.find(unit => unit.id === activeId);
    const next = this.idle && !this.animatedSnapshot && !this.reducedMotion.matches
      && snapshot?.outcome === 'ongoing' && active && active.hp > 0 ? active.id : null;
    if (next !== this.bobId) {
      if (this.bobId !== null) {
        const unit = snapshot?.units.find(unit => unit.id === this.bobId);
        const image = this.images.get(this.bobId);
        if (image?.scene) {
          const point = unit ? projectTile(this.byCell.get(cellKey(unit.cell))!) : this.bobBase;
          if (point) image.setPosition(point.x, point.y);
        }
      }
      this.bobId = next;
      this.bobElapsed = 0;
      this.bobOffset = 0;
    }
    this.placeBob();
  }

  private placeBob(): void {
    if (this.bobId === null || !this.snapshot) return;
    const unit = this.snapshot.units.find(unit => unit.id === this.bobId)!;
    const point = projectTile(this.byCell.get(cellKey(unit.cell))!);
    this.bobBase = point;
    this.images.get(unit.id)!.setPosition(point.x, point.y + this.bobOffset);
  }

  constructor(private readonly scene: Phaser.Scene, private readonly catalog: ContentCatalog, private readonly mapId: MapId,
    private readonly onSelect: (cell: CellPosition | null) => void) {
    this.board = buildBoardPresentation(catalog, mapId);
    this.byCell = new Map(this.board.tiles.map(tile => [cellKey(tile), tile]));
    this.root = scene.add.container();
    for (const tile of orderTiles(this.board.tiles)) {
      const point = projectTile(tile);
      // Repeated immutable column shapes share a texture; depth and placement stay per tile.
      const columnBounds = {left:-TILE_WIDTH/2, top:-TILE_HEIGHT/2, right:TILE_WIDTH/2, bottom:TILE_HEIGHT/2 + BASE_THICKNESS + tile.elevation * ELEVATION_STEP};
      const columnKey = this.shapeTexture(`column-${tile.elevation}`, columnBounds, graphics => {
        const local = tileFaces({x:0,y:0,elevation:tile.elevation});
        graphics.translateCanvas(0, tile.elevation * ELEVATION_STEP);
        for (const [points,color] of [[local.left,0x354538],[local.right,0x4c6050],[local.top,0x5b7157]] as const)
          graphics.fillStyle(color).fillPoints(points.map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
      });
      const column = scene.add.image(point.x + columnBounds.left, point.y + columnBounds.top, columnKey)
        .setOrigin(0).setDisplaySize(TILE_WIDTH, columnBounds.bottom - columnBounds.top).setDepth(tile.depth);
      const surface = scene.add.container(point.x, point.y).setScale(1, TILE_HEIGHT / TILE_WIDTH).setDepth(tile.depth + 1);
      const image = scene.add.image(0, 0, tile.surfaceAssetId).setOrigin(0.5)
        .setDisplaySize(TILE_WIDTH / Math.SQRT2, TILE_WIDTH / Math.SQRT2).setRotation(Math.PI / 4);
      surface.add(image);
      this.surfaces.push({ tile, image });
      const highlight = scene.add.image(point.x - 44, point.y - 24, this.highlightTexture(0))
        .setOrigin(0).setDisplaySize(88,48).setDepth(tile.depth + 2);
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
      const health = scene.add.graphics();
      this.healthBars.set(occupant.id, health);
      const badge = scene.add.graphics().setVisible(false);
      const shield = [[-7,-8],[7,-8],[6,2],[0,8],[-6,2]].map(([x,y])=>new Phaser.Math.Vector2(x,y));
      badge.fillStyle(0x172033).fillPoints(shield,true);
      badge.lineStyle(2,0xa9f3e6).strokePoints(shield,true);
      badge.lineStyle(2,0xffffff).lineBetween(0,-4,0,4).lineBetween(-3,0,3,0);
      this.guardBadges.set(occupant.id, badge);
      this.root.add([ring, image, health, badge]);
    }
    // Reserve sprite space on every cell so moving never escapes the fitted bounds.
    // Reserve the maximum bounded bar extent on every cell (also during movement).
    const rectangles = [boardBounds(this.board.tiles), ...this.board.tiles.map(tile => {
      const p = projectTile(tile);
      return {left:p.x-48, right:p.x+24, top:p.y-46, bottom:p.y+19};
    }), ...this.canopies.map(({ tile }) => canopyBounds(tile)),
      ...this.board.tiles.flatMap(tile => this.board.occupants.map(occupant => {
        const asset = catalog.assets[occupant.assetId];
        return unitBounds(tile, { x: occupant.anchor.x / asset.runtimeWidth, y: occupant.anchor.y / asset.runtimeHeight });
      }))];
    this.reducedMotion.addEventListener('change', this.motionChanged);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateBob);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.idle = false;
      this.bobId = null;
      this.bobOffset = 0;
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateBob);
      this.reducedMotion.removeEventListener('change', this.motionChanged);
    });
    this.bounds = {
      left: Math.min(...rectangles.map(r => r.left)), right: Math.max(...rectangles.map(r => r.right)),
      top: Math.min(...rectangles.map(r => r.top)) - BOB_HEIGHT, bottom: Math.max(...rectangles.map(r => r.bottom)),
    };
  }

  /** Local shape cache, bounded by elevations and the overlay flag combinations.
   * Six pixels per board unit preserves the maximum fitted 1.5 × 4 zoom density.
   * Textures are owned by this game's manager and reused across scene restarts.
   */
  private shapeTexture(name:string, bounds:Bounds, draw:(graphics:Phaser.GameObjects.Graphics)=>void):string {
    const key=`battle-shape-v1-${name}`;
    if(!this.scene.textures.exists(key)) {
      const graphics=this.scene.make.graphics({x:0,y:0},false);
      const density=MAX_BOARD_SCALE*MAX_ZOOM;
      graphics.scaleCanvas(density,density).translateCanvas(-bounds.left,-bounds.top);
      draw(graphics);
      graphics.generateTexture(key,Math.ceil((bounds.right-bounds.left)*density),Math.ceil((bounds.bottom-bounds.top)*density));
      graphics.destroy();
    }
    return key;
  }

  private highlightTexture(flags:number):string {
    return this.shapeTexture(`highlight-${flags}`,{left:-44,top:-24,right:44,bottom:24},graphics=>{
      const vertices=tileFaces({x:0,y:0,elevation:0}).top.map(p=>new Phaser.Math.Vector2(p.x,p.y));
      graphics.lineStyle(0.8,0x17291f,0.6).strokePoints(vertices,true);
      if(flags&1024) {
        graphics.lineStyle(3,0xff9c42).strokePoints(vertices.map(p=>new Phaser.Math.Vector2(p.x*0.65,p.y*0.65)),true);
        graphics.fillStyle(0xff9c42).fillTriangle(-4,12,4,12,0,5);
      }
      if(flags&1) {
        graphics.fillStyle(REACHABLE_COLOR,0.26).fillPoints(vertices,true);
        graphics.lineStyle(1.5,REACHABLE_COLOR,0.85).strokePoints(vertices,true);
      }
      if(flags&2) graphics.lineStyle(3,ACTIVE_COLOR).strokePoints(vertices,true);
      if(flags&4) graphics.lineStyle(2.5,0xb9b1ff).strokePoints(vertices,true);
      if(flags&8) graphics.lineStyle(2.5,SELECTED_COLOR).strokePoints(vertices.map(p=>new Phaser.Math.Vector2(p.x*0.78,p.y*0.78)),true);
      if(flags&128) {
        graphics.fillStyle(0xb48aff,0.25).fillPoints(vertices,true);
        graphics.lineStyle(1.5,0xd3b7ff).strokePoints(vertices.map(p=>new Phaser.Math.Vector2(p.x*0.9,p.y*0.9)),true);
        graphics.fillStyle(0xffffff).fillCircle(-3,13,1.3).fillCircle(3,13,1.3);
      }
      if(flags&256) graphics.lineStyle(2.5,0xffffff).strokeEllipse(0,0,18,9);
      if(flags&512) {
        graphics.fillStyle(0xff82c4,0.4).fillPoints(vertices,true);
        graphics.lineStyle(2.5,0xffb9df).strokePoints(vertices,true);
        graphics.lineStyle(4,0x172033).lineBetween(-5,13,5,13).lineBetween(0,9,0,17);
        graphics.lineStyle(2,0xffffff).lineBetween(-5,13,5,13).lineBetween(0,9,0,17);
      }
      if(flags&48) {
        const valid=!!(flags&16),color=valid?0x63eba0:0xff867c;
        graphics.fillStyle(color,0.32).fillPoints(vertices,true);
        graphics.lineStyle(flags&64?3.5:2,color).strokePoints(vertices,true);
        // A check / X at the front edge stays clear of the unit's feet and reads without color.
        graphics.lineStyle(4,0x172033).lineBetween(-5,10,valid?-1:5,16).lineBetween(valid?-1:-5,16,6,8);
        graphics.lineStyle(2,0xffffff).lineBetween(-5,10,valid?-1:5,16).lineBetween(valid?-1:-5,16,6,8);
        if(flags&64) graphics.lineStyle(2,0xffffff).strokePoints(vertices.map(p=>new Phaser.Math.Vector2(p.x*0.82,p.y*0.82)),true);
      }
    });
  }

  present(snapshot: BattleState, reachable: readonly CellPosition[], selected: CellPosition | null, path: readonly CellPosition[] = [], targets: readonly TargetOverlay[] = [], hover: HoverPreview | null = null, danger: readonly CellPosition[] = []): void {
    // Modal/layout refreshes must not remove a defeated target before impact.
    snapshot = this.animatedSnapshot ?? snapshot;
    this.snapshot = snapshot;
    this.reachable = reachable;
    this.targets = this.animatedSnapshot ? [] : targets;
    this.hoverPreview = this.animatedSnapshot ? null : hover;
    this.selected = selected ? this.byCell.get(cellKey(selected)) ?? null : null;
    const activeId = snapshot.initiative[snapshot.activeIndex];
    const active = snapshot.units.find(unit => unit.id === activeId)!;
    const dangerKeys = new Set((this.animatedSnapshot ? [] : danger).map(cellKey));
    const reachableKeys = new Set(reachable.map(cellKey));
    const pathKeys = new Set(path.map(cellKey));
    const targetByCell = new Map(this.targets.map(target => [cellKey(target.cell),target]));
    const hoverKeys = new Set(this.hoverPreview?.cells.map(cellKey));
    const hoverTargetKeys = new Set(this.hoverPreview?.targets.map(cellKey));
    for (const tile of this.board.tiles) {
      const key = cellKey(tile);
      const target = targetByCell.get(key);
      const flags = (reachableKeys.has(key) && key !== cellKey(active.cell) ? 1 : 0)
        | (key === cellKey(active.cell) ? 2 : 0) | (pathKeys.has(key) ? 4 : 0) | (this.selected === tile && !target ? 8 : 0)
        | (target ? target.valid ? 16 : 32 : 0) | (target?.selected ? 64 : 0)
        | (hoverKeys.has(key) ? 128 : 0) | (this.hoverPreview && key===cellKey(this.hoverPreview.origin) ? 256 : 0)
        | (hoverTargetKeys.has(key) && !target ? 512 : 0) | (dangerKeys.has(key) ? 1024 : 0);
      this.highlights.get(key)!.setTexture(this.highlightTexture(flags));
    }
    for (const unit of snapshot.units) {
      const tile = this.byCell.get(cellKey(unit.cell))!;
      const point = projectTile(tile);
      const depth = tile.depth;
      const moving = this.moving?.unitId === unit.id ? this.moving : null;
      const position = moving?.point ?? point;
      const unitDepth = moving?.depth ?? depth;
      this.images.get(unit.id)!.setPosition(position.x, position.y).setDepth(unitDepth + OCCUPANT_LAYER).setVisible(unit.hp > 0);
      const definition = unit.side === 'player' ? this.catalog.heroes[unit.defId] : this.catalog.enemies[unit.defId];
      this.drawHealth(unit.id, healthFraction(unit.hp, definition.stats.maxHp), unit.hp > 0);
      this.placeHealth(unit.id, position, unitDepth);
      this.guardBadges.get(unit.id)!.setVisible(guardedEffect(unit) !== null);
      this.placeGuard(unit.id, position, unitDepth);
      const ring = this.rings.get(unit.id)!.clear().setDepth(depth + 2.25).setVisible(unit.hp > 0);
      ring.lineStyle(unit.id === activeId ? 3 : 2, unit.id === activeId ? ACTIVE_COLOR : unit.side === 'player' ? 0x6ddbf5 : 0xf17a73)
        .strokeEllipse(point.x, point.y, 26, 12);
    }
    for (const canopy of this.canopies) {
      const overlaps = snapshot.units.some(unit => {
        if (unit.hp <= 0) return false;
        const tile = this.byCell.get(cellKey(unit.cell))!;
        const image = this.images.get(unit.id)!;
        const art = unitBounds(tile, { x: image.originX, y: image.originY });
        return canopyOccludes(canopy.tile, tile, { ...art, top: art.top - BOB_HEIGHT }, this.catalog.maps[this.mapId].height);
      });
      canopy.graphics.setAlpha(overlaps ? CANOPY_ART.fadedAlpha : 1);
    }
    this.syncBob();
    this.root.sort('depth');
    this.publish();
  }

  /** Tween view objects only; snapshots and command results remain unchanged. */
  animate(before: BattleState, after: BattleState, events: readonly BattleEvent[]): { done: Promise<void>; cancel: () => void } {
    this.animatedSnapshot = before;
    this.present(before, [], null);
    const move = events.find((e): e is Extract<BattleEvent,{type:'moved'}> => e.type==='moved');
    const {signature, feedback} = abilityPresentation(events);
    const STEP_MS=70, COMBAT_MS=180, TURN_MS=25;
    const duration=move ? Math.max(1,move.path.length-1)*STEP_MS : signature ? 560 : feedback.length ? COMBAT_MS : TURN_MS;
    const marker={progress:0};
    const labels:Phaser.GameObjects.Text[]=[];
    const anchor=(id:number)=>projectTile(this.byCell.get(cellKey(before.units.find(u=>u.id===id)!.cell))!);
    for(const item of feedback) {
      const p=anchor(item.unitId);
      const y=p.y+(item.kind==='guard'?16:item.kind==='defeat'?-88:-64);
      const text=this.scene.add.text(p.x,y,item.text,{fontFamily:'sans-serif',fontSize:'18px',fontStyle:'bold',
        color:item.kind==='guard'?'#a9f3e6':'#ffffff',backgroundColor:'#172033',padding:{x:4,y:2}})
        .setResolution(2).setOrigin(0.5).setDepth(10001).setVisible(!signature);
      this.root.add(text);labels.push(text);
      this.effectLabels.push({text,anchor:p,kind:item.kind});
    }
    const graphics=signature ? this.scene.add.graphics().setDepth(10000) : null;
    if(graphics && signature){
      this.root.add(graphics);
      const a=anchor(signature.actorId),b=anchor(signature.targetId);
      this.effect={kind:signature.kind,actorId:signature.actorId,targetId:signature.targetId,progress:0,
        from:{x:a.x,y:a.y-28},to:{x:b.x,y:b.y-28},
        feedback:feedback.map((item,i)=>({unitId:item.unitId,text:item.text,x:labels[i].x,y:labels[i].y,visible:false}))};
    }
    // New objects need sorting immediately, not only after a later HUD refresh.
    this.root.sort('depth');
    this.layoutFeedback();
    this.publish();
    let complete!:()=>void;const done=new Promise<void>(resolve=>{complete=resolve;});let finished=false;
    let tween:Phaser.Tweens.Tween | undefined;
    const finish=()=>{
      if(finished)return;finished=true;tween?.stop();
      labels.forEach(l=>{if(l.scene)l.destroy();});if(graphics?.scene)graphics.destroy();
      this.effectLabels=[];this.animatedSnapshot=undefined;this.effect=null;this.moving=null;
      // Scene shutdown destroys the display list before canceling this presentation.
      // Resolve cancellation without touching images whose scene/texture binding is gone.
      if(this.root.scene)this.present(after,[],null);
      complete();
    };
    tween=this.scene.tweens.add({targets:marker,progress:1,duration,onUpdate:()=>{
      if(finished)return;
      if(!this.root.scene){finish();return;}
      if(graphics && signature && this.effect){
        const {from:a,to:b}=this.effect,p=marker.progress;
        const travel=Math.min(1,p/0.45),impact=Math.max(0,(p-0.45)/0.55);
        const angle=Math.atan2(b.y-a.y,b.x-a.x),dx=Math.cos(angle),dy=Math.sin(angle);
        const size=Math.max(1,0.65/this.view.scale);
        graphics.clear();
        if(signature.kind==='guarded_strike'){
          // A blade sweeps toward the defender; its white edge reads without color.
          if(p<0.6){
            const x=a.x+(b.x-a.x)*travel,y=a.y+(b.y-a.y)*travel;
            graphics.lineStyle(7*size,0xffd36a,1-impact).beginPath()
              .arc(x,y,23*size,angle-1.3+travel,angle+0.8+travel).strokePath();
            graphics.lineStyle(2*size,0xffffff,1-impact).lineBetween(a.x,a.y,x,y);
          }
          if(signature.guarded){
            const x=a.x-22*size,y=a.y+4;
            const shield=[[-12,-13],[12,-13],[10,3],[0,14],[-10,3]].map(([dx,dy])=>new Phaser.Math.Vector2(x+dx*size,y+dy*size));
            graphics.fillStyle(0x163d3b,0.9).fillPoints(shield,true);
            graphics.lineStyle(3*size,0x86ead6).strokePoints(shield,true);
            graphics.lineStyle(2*size,0xffffff).lineBetween(x,y-8*size,x,y+7*size);
          }
        }else if(p<0.45){
          const x=a.x+(b.x-a.x)*travel,y=a.y+(b.y-a.y)*travel;
          if(signature.kind==='high_shot'){
            graphics.lineStyle(3*size,0xffe3a0).lineBetween(x-dx*28*size,y-dy*28*size,x,y);
            graphics.fillStyle(0xffffff).fillTriangle(x+dx*5*size,y+dy*5*size,x-(dx*7+dy*5)*size,y-(dy*7-dx*5)*size,x-(dx*7-dy*5)*size,y-(dy*7+dx*5)*size);
            graphics.lineStyle(2*size,0xffe3a0).lineBetween(x-(dx*25+dy*5)*size,y-(dy*25-dx*5)*size,x-dx*18*size,y-dy*18*size);
          }else{
            graphics.lineStyle(7*size,0x9c85ff,0.35).lineBetween(x-dx*32*size,y-dy*32*size,x,y);
            graphics.fillStyle(0x9c85ff,0.3).fillCircle(x,y,12*size);
            graphics.fillStyle(0xb9adff).fillCircle(x,y,7*size);
            graphics.fillStyle(0xffffff).fillCircle(x+2*size,y-2*size,3*size);
          }
        }
        if(p>=0.45 && !signature.missed){
          const radius=(8+impact*19)*size;
          graphics.lineStyle(3*size,signature.kind==='magic_missile'?0xc4b9ff:0xffe3a0,1-impact).strokeCircle(b.x,b.y,radius);
          for(let i=0;i<4;i++){
            const theta=i*Math.PI/2+Math.PI/4;
            graphics.lineStyle(2*size,0xffffff,1-impact).lineBetween(b.x+Math.cos(theta)*radius,b.y+Math.sin(theta)*radius,
              b.x+Math.cos(theta)*(radius+8*size),b.y+Math.sin(theta)*(radius+8*size));
          }
        }
        labels.forEach((label,i)=>{
          const visible=feedback[i].kind==='guard' || p>=0.45;
          label.setVisible(visible);this.effect!.feedback[i].visible=visible;
        });
        this.effect.progress=p;
        // Update only the transient fields; geometry diagnostics need no per-frame recomputation.
        const game=document.querySelector<HTMLElement>('#game')!;
        const report=JSON.parse(game.dataset.battleReport!);report.effect=this.effect;report.feedbackBounds=this.feedbackBounds();
        game.dataset.battleReport=JSON.stringify(report);
      }
      if(!move)return;
      const progress=marker.progress*(move.path.length-1),i=Math.min(Math.floor(progress),move.path.length-2);
      if(i<0)return;
      const a=this.byCell.get(cellKey(move.path[i]))!,b=this.byCell.get(cellKey(move.path[i+1]))!;
      const p=projectTile(a),q=projectTile(b),t=progress-i;
      const point = {x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t}, depth = (t<0.5?a:b).depth;
      this.moving = {unitId:move.unitId,point,depth};
      this.images.get(move.unitId)!.setPosition(point.x,point.y).setDepth(depth+OCCUPANT_LAYER);
      this.placeHealth(move.unitId,point,depth);
      this.placeGuard(move.unitId,point,depth);
      const movingTile={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,elevation:a.elevation+(b.elevation-a.elevation)*t};
      for(const canopy of this.canopies){
        const overlaps=before.units.some(unit=>{
          if(unit.hp<=0)return false;
          const tile=unit.id===move.unitId?movingTile:this.byCell.get(cellKey(unit.cell))!;
          const image=this.images.get(unit.id)!;
          return canopyOccludes(canopy.tile,tile,unitBounds(tile,{x:image.originX,y:image.originY}),this.catalog.maps[this.mapId].height);
        });
        canopy.graphics.setAlpha(overlaps?CANOPY_ART.fadedAlpha:1);
      }
      this.root.sort('depth');
      const game=document.querySelector<HTMLElement>('#game')!;
      const report=JSON.parse(game.dataset.battleReport!);
      const unit=report.units.find((u:{id:number})=>u.id===move.unitId);
      const bar=this.healthBars.get(move.unitId)!;
      unit.position=point;unit.depth=depth+OCCUPANT_LAYER;
      unit.health.position={x:bar.x,y:bar.y};unit.health.depth=bar.depth;
      const screen=this.root.getWorldTransformMatrix().transformPoint(bar.x,bar.y);
      unit.health.screen={x:screen.x,y:screen.y};
      unit.guard=this.guardReport(move.unitId);
      game.dataset.battleReport=JSON.stringify(report);
    },onComplete:finish});
    return {done,cancel:finish};
  }

  fit(width: number, height: number, region: BoardRegion): void {
    // Responsive panel layout can precede Phaser's fullscreen resize event.
    // Do not mix its new DOM geometry with stale viewport dimensions: the
    // following scale resize fits the settled viewport with the original zoom.
    if (width !== window.innerWidth || height !== window.innerHeight) return;
    const layout = fitBoard(this.bounds, region);
    const viewportChanged = width !== this.viewport.width || height !== this.viewport.height;
    if(viewportChanged)this.resetPicking();
    const zoom = this.view.scale / this.fitScale;
    this.viewport = { width, height };
    this.region = region;
    this.fitScale = layout.scale;
    // Panel text/layout changes are not navigation: retain the camera, clamping
    // only where the new available area or zoom limits require it. Real viewport
    // changes still refit the board and preserve relative zoom.
    const center={x:region.x+region.width/2,y:region.y+region.height/2};
    this.applyView(viewportChanged ? {scale:layout.scale*zoom,x:center.x+(layout.x-center.x)*zoom,y:center.y+(layout.y-center.y)*zoom} : this.view);
  }

  /** A fresh battle is centered after its initial automatic turns settle the HUD. */
  resetView(): void {
    this.applyView(fitBoard(this.bounds, this.region));
  }

  private applyView(view: View): void {
    const constrained=constrainView(view, this.bounds, this.region, this.fitScale);
    if(constrained.x!==this.view.x || constrained.y!==this.view.y || constrained.scale!==this.view.scale)this.resetPicking();
    this.view = constrained;
    this.root.setPosition(this.view.x, this.view.y).setScale(this.view.scale);
    this.layoutFeedback();
    for (const bar of this.healthBars.values()) bar.setScale(healthBarScale(this.view.scale));
    if(this.snapshot) for(const unit of this.snapshot.units) {
      const tile=this.byCell.get(cellKey(unit.cell))!;
      const moving=this.moving?.unitId===unit.id?this.moving:null;
      this.placeGuard(unit.id,moving?.point??projectTile(tile),moving?.depth??tile.depth);
    }
    this.publish();
  }

  private placeGuard(id:number, point:Point, depth:number):void {
    // A recognizable shield stays at least 12 CSS pixels wide at fitted mobile scale.
    const scale=Math.max(1,12/(14*this.view.scale));
    const x=point.x-UNIT_ART.width/2-9*scale;
    // Stay attached in board space; the canvas clip hides offscreen annotations.
    this.guardBadges.get(id)!.setPosition(
      x,
      point.y-Math.max(28,8*scale+8/this.view.scale-HEALTH_BAR.offsetY))
      .setScale(scale).setDepth(9001+depth/10000);
  }

  private guardReport(id:number) {
    const badge=this.guardBadges.get(id)!;
    const screen=this.root.getWorldTransformMatrix().transformPoint(badge.x,badge.y);
    return {visible:badge.visible,position:{x:badge.x,y:badge.y},screen:{x:screen.x,y:screen.y},
      width:14*badge.scaleX*this.view.scale,height:16*badge.scaleY*this.view.scale,
      depth:badge.depth,interactive:!!badge.input};
  }

  // Informational annotations must clear foreground tiles; combat effects start at 10000.
  private placeHealth(id:number, point:Point, depth:number):void {
    this.healthBars.get(id)!.setPosition(point.x,point.y+HEALTH_BAR.offsetY).setDepth(9000+depth/10000);
  }

  private drawHealth(id:number, ratio:number, visible:boolean):void {
    const bar=this.healthBars.get(id)!;
    bar.clear().setVisible(visible).setScale(healthBarScale(this.view.scale));
    const stroke=(fraction:number,width:number,color:number)=>{
      const points=healthArc(fraction);
      bar.lineStyle(width,color,1).beginPath().moveTo(points[0].x,points[0].y);
      for(const p of points.slice(1))bar.lineTo(p.x,p.y);
      bar.strokePath();
    };
    stroke(1,HEALTH_BAR.track,HEALTH_COLORS.background);
    if(ratio>0)stroke(ratio,HEALTH_BAR.fill,healthColor(ratio));
  }

  private layoutFeedback():void {
    // Keep labels legible when the whole board is fitted into short mobile viewports.
    // Coordinates remain board-local, including the extra separation for defeat.
    const scale=Math.max(1,14/(18*this.view.scale));
    this.effectLabels.forEach(({text,anchor,kind})=>{
      text.setScale(scale);
      const height=text.height*scale;
      const y=kind==='guard'?anchor.y+height/2+6/this.view.scale
        :anchor.y-54-height/2-(kind==='defeat'?height+3/this.view.scale:0);
      text.setPosition(anchor.x,y);
    });
    // Keep each unit's result/defeat stack readable inside the clipped region.
    // Move the stack together so clamping cannot collapse two labels into one.
    const stacks:{labels:Phaser.GameObjects.Text[];left:number;right:number;top:number;bottom:number}[]=[];
    for(const key of new Set(this.effectLabels.map(({anchor})=>`${anchor.x},${anchor.y}`))){
      const labels=this.effectLabels.filter(({anchor})=>`${anchor.x},${anchor.y}`===key).map(({text})=>text);
      const left=Math.min(...labels.map(t=>t.x-t.displayWidth/2)),right=Math.max(...labels.map(t=>t.x+t.displayWidth/2));
      const top=Math.min(...labels.map(t=>t.y-t.displayHeight/2)),bottom=Math.max(...labels.map(t=>t.y+t.displayHeight/2));
      const {x,y,scale}=this.view,r=this.region;
      const dx=Math.max((r.x+4-x)/scale-left,Math.min(0,(r.x+r.width-4-x)/scale-right));
      const dy=Math.max((r.y+4-y)/scale-top,Math.min(0,(r.y+r.height-4-y)/scale-bottom));
      labels.forEach(t=>t.setPosition(t.x+dx,t.y+dy));
      stacks.push({labels,left:left+dx,right:right+dx,top:top+dy,bottom:bottom+dy});
    }
    // Clamping can put different units at the same edge. Only on collision,
    // collect their intact stacks into one column. Reserve hidden impact labels
    // too, so the group does not jump when damage/defeat becomes visible.
    if(stacks.some((a,i)=>stacks.some((b,j)=>i<j && a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom))){
      const {x,y,scale}=this.view,r=this.region,gap=3/scale;
      stacks.sort((a,b)=>a.top-b.top);
      const width=Math.max(...stacks.map(s=>s.right-s.left));
      const height=stacks.reduce((sum,s)=>sum+s.bottom-s.top,0)+gap*(stacks.length-1);
      const center=(Math.min(...stacks.map(s=>s.left))+Math.max(...stacks.map(s=>s.right)))/2;
      const columnX=Math.max((r.x+4-x)/scale+width/2,Math.min(center,(r.x+r.width-4-x)/scale-width/2));
      let top=Math.max((r.y+4-y)/scale,Math.min(stacks[0].top,(r.y+r.height-4-y)/scale-height));
      for(const stack of stacks){
        const dx=columnX-(stack.left+stack.right)/2,dy=top-stack.top;
        stack.labels.forEach(t=>t.setPosition(t.x+dx,t.y+dy));
        top+=stack.bottom-stack.top+gap;
      }
    }
    if(this.effect)this.effectLabels.forEach(({text},i)=>{this.effect!.feedback[i].x=text.x;this.effect!.feedback[i].y=text.y;});
  }

  private feedbackBounds(){return this.effectLabels.filter(({text})=>text.visible).map(({text})=>{
    const r=text.getBounds();return {text:text.text,x:r.x,y:r.y,width:r.width,height:r.height};
  });}

  pan(dx: number, dy: number): boolean {
    this.resetPicking();
    const before = this.view;
    this.applyView({ ...before, x: before.x + dx, y: before.y + dy });
    return this.view.x !== before.x || this.view.y !== before.y;
  }

  zoom(factor: number, anchor: Point): boolean {
    this.resetPicking();
    const before = this.view;
    const point = screenToBoard(anchor, this.view);
    const scale = Math.max(this.fitScale, Math.min(this.fitScale * MAX_ZOOM, this.view.scale * factor));
    this.applyView({ x: anchor.x - point.x * scale, y: anchor.y - point.y * scale, scale });
    return this.view.scale !== before.scale || this.view.x !== before.x || this.view.y !== before.y;
  }

  select(point: Point): void {
    const candidates=this.pickCandidates(point),keys=candidates.map(cellKey).join('|');
    const same=this.picking?.keys===keys && Math.hypot(point.x-this.picking.point.x,point.y-this.picking.point.y)<DRAG_THRESHOLD;
    const index=same ? (this.picking!.index+1)%candidates.length : 0;
    this.picking=candidates.length ? {point,keys,index} : null;
    this.selectionEvents++;
    const tile=candidates[index];
    this.onSelect(tile ? {x:tile.x,y:tile.y} : null);
  }

  cellAt(point: Point): CellPosition | null {
    const candidates=this.pickCandidates(point),keys=candidates.map(cellKey).join('|');
    const same=this.picking?.keys===keys && Math.hypot(point.x-this.picking.point.x,point.y-this.picking.point.y)<DRAG_THRESHOLD;
    const tile=candidates[same ? this.picking!.index : 0];
    return tile ? { x: tile.x, y: tile.y } : null;
  }

  resetPicking(): void { this.picking=null; }

  get pickingHint(): string {
    const count=this.picking?.keys.split('|').length ?? 0;
    return count>1 ? `Overlap ${this.picking!.index+1}/${count}: tap/click again for next tile · ` : '';
  }

  private pickCandidates(point: Point): Tile[] {
    const local=screenToBoard(point,this.view);
    const candidates=pickTileCandidates(this.board.tiles,local);
    const front=candidates[0];
    // Only visible opaque living art can precede the solid terrain hit. Use the
    // authoritative cell/anchor, independent of transient presentation offsets.
    const units=(this.snapshot?.units ?? []).filter(unit=>unit.hp>0).map(unit=>({unit,tile:this.byCell.get(cellKey(unit.cell))!}))
      .sort((a,b)=>b.tile.depth-a.tile.depth);
    for(const {unit,tile} of units){
      if(front && tile.depth+OCCUPANT_LAYER<front.depth+1)continue;
      const image=this.images.get(unit.id)!;
      const bounds=unitBounds(tile,{x:image.originX,y:image.originY});
      if(local.x<bounds.left || local.x>=bounds.right || local.y<bounds.top || local.y>=bounds.bottom)continue;
      const x=Math.floor((local.x-bounds.left)*image.frame.realWidth/UNIT_ART.width);
      const y=Math.floor((local.y-bounds.top)*image.frame.realHeight/UNIT_ART.height);
      if(!this.scene.textures.getPixelAlpha(x,y,image.texture.key,image.frame.name))continue;
      return [tile,...candidates.filter(candidate=>cellKey(candidate)!==cellKey(tile))];
    }
    return candidates;
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
      const bobOffset = unit.id === this.bobId ? this.bobOffset : 0;
      const expected = matrix.transformPoint(projected.x, projected.y + bobOffset);
      const base = matrix.transformPoint(projected.x, projected.y);
      const actual = image.getWorldTransformMatrix().transformPoint(0, 0);
      return { id: unit.id, unitId: unit.defId, side: unit.side, tile: { ...unit.cell, elevation: tile.elevation },
        guard:this.guardReport(unit.id),
        health: (()=>{
          const bar=this.healthBars.get(unit.id)!;
          const definition=unit.side==='player'?this.catalog.heroes[unit.defId]:this.catalog.enemies[unit.defId];
          const ratio=healthFraction(unit.hp,definition.stats.maxHp);
          const screen=matrix.transformPoint(bar.x,bar.y);
          return {hp:unit.hp,maxHp:definition.stats.maxHp,ratio,color:healthColor(ratio),visible:bar.visible,
            position:{x:bar.x,y:bar.y},screen:{x:screen.x,y:screen.y},depth:bar.depth,scale:bar.scaleX,
            interactive:!!bar.input};
        })(),
        assetId: image.texture.key, origin: { x: image.originX, y: image.originY }, depth: image.depth,
        position: { x: image.x, y: image.y }, bobOffset, baseAnchorError: Math.hypot(base.x - actual.x, base.y - actual.y), anchorError: Math.hypot(expected.x - actual.x, expected.y - actual.y) };
    });
    const { x, y, scale } = this.view;
    document.querySelector<HTMLElement>('#game')!.dataset.battleReport = JSON.stringify({
      viewport: this.viewport, region: this.region, transform: this.view, tiles: this.board.tiles, units,
      activeId: this.snapshot.initiative[this.snapshot.activeIndex], commandCount: this.snapshot.commandCount,
      reachable: this.reachable, targets: this.targets, hover: this.hoverPreview, selected: this.selected ? { x: this.selected.x, y: this.selected.y, elevation: this.selected.elevation } : null,
      selectionEvents: this.selectionEvents, objectCount: this.scene.children.length + this.root.length + this.surfaces.length,
      shapeTextures: this.scene.textures.getTextureKeys().filter(key=>key.startsWith('battle-shape-v1-')).sort().map(key=>{
        const source=this.scene.textures.get(key).getSourceImage();
        return {key,width:source.width,height:source.height,rgbaBytes:source.width*source.height*4};
      }),
      effect: this.effect,
      feedbackBounds: this.feedbackBounds(),
      depthOrder: this.root.list.map(object => Number('depth' in object ? object.depth : 0)),
      surfaceCornerError: Math.max(...surfaceErrors),
      canopies: this.canopies.map(({ tile, graphics }) => ({ tile, depth: graphics.depth, alpha: graphics.alpha })),
      bounds: { left: x + this.bounds.left * scale, right: x + this.bounds.right * scale,
        top: y + this.bounds.top * scale, bottom: y + this.bounds.bottom * scale },
    });
  }
}
