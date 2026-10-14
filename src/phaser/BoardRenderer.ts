import Phaser from 'phaser';
import type { CellPosition, ContentCatalog, MapId } from '../content/types';
import type { BattleEvent, BattleState } from '../domain/types';
import { buildBoardPresentation, OCCUPANT_LAYER } from '../geometry/boardPresentation';
import { CANOPY_ART, UNIT_ART, canopyBounds, canopyOccludes, unitBounds } from '../geometry/canopy';
import { boardBounds, fitBoard, orderTiles, projectTile, tileFaces, BASE_THICKNESS, ELEVATION_STEP, MAX_BOARD_SCALE, TILE_HEIGHT, TILE_WIDTH, type Bounds, type Point, type Tile } from '../geometry/iso';
import { constrainView, MAX_ZOOM, pickTile, screenToBoard, type View } from '../geometry/picking';
import { abilityPresentation, type SignatureKind } from './abilityPresentation';

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
  private readonly highlights = new Map<string, Phaser.GameObjects.Image>();
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
  private animatedSnapshot: BattleState | undefined;
  private effect: { kind: SignatureKind; actorId: number; targetId: number; progress: number;
    from: Point; to: Point; feedback: {unitId: number; text: string; x: number; y: number; visible: boolean}[] } | null = null;
  private effectLabels: {text: Phaser.GameObjects.Text; anchor: Point; kind: 'result'|'defeat'|'guard'}[] = [];

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

  /** Local shape cache, bounded by elevations and the 16 overlay combinations.
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
      if(flags&1) {
        graphics.fillStyle(REACHABLE_COLOR,0.26).fillPoints(vertices,true);
        graphics.lineStyle(1.5,REACHABLE_COLOR,0.85).strokePoints(vertices,true);
      }
      if(flags&2) graphics.lineStyle(3,ACTIVE_COLOR).strokePoints(vertices,true);
      if(flags&4) graphics.lineStyle(2.5,0xb9b1ff).strokePoints(vertices,true);
      if(flags&8) graphics.lineStyle(2.5,SELECTED_COLOR).strokePoints(vertices.map(p=>new Phaser.Math.Vector2(p.x*0.78,p.y*0.78)),true);
    });
  }

  present(snapshot: BattleState, reachable: readonly CellPosition[], selected: CellPosition | null, path: readonly CellPosition[] = []): void {
    // Modal/layout refreshes must not remove a defeated target before impact.
    snapshot = this.animatedSnapshot ?? snapshot;
    this.snapshot = snapshot;
    this.reachable = reachable;
    this.selected = selected ? this.byCell.get(cellKey(selected)) ?? null : null;
    const activeId = snapshot.initiative[snapshot.activeIndex];
    const active = snapshot.units.find(unit => unit.id === activeId)!;
    const reachableKeys = new Set(reachable.map(cellKey));
    const pathKeys = new Set(path.map(cellKey));
    for (const tile of this.board.tiles) {
      const key = cellKey(tile);
      const flags = (reachableKeys.has(key) && key !== cellKey(active.cell) ? 1 : 0)
        | (key === cellKey(active.cell) ? 2 : 0) | (pathKeys.has(key) ? 4 : 0) | (this.selected === tile ? 8 : 0);
      this.highlights.get(key)!.setTexture(this.highlightTexture(flags));
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

  /** Tween view objects only; snapshots and command results remain unchanged. */
  animate(before: BattleState, after: BattleState, events: readonly BattleEvent[]): { done: Promise<void>; cancel: () => void } {
    this.present(before, [], null);
    this.animatedSnapshot = before;
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
      this.effectLabels=[];this.animatedSnapshot=undefined;this.effect=null;
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
        const report=JSON.parse(game.dataset.battleReport!);report.effect=this.effect;
        game.dataset.battleReport=JSON.stringify(report);
      }
      if(!move)return;
      const progress=marker.progress*(move.path.length-1),i=Math.min(Math.floor(progress),move.path.length-2);
      if(i<0)return;
      const a=this.byCell.get(cellKey(move.path[i]))!,b=this.byCell.get(cellKey(move.path[i+1]))!;
      const p=projectTile(a),q=projectTile(b),t=progress-i;
      this.images.get(move.unitId)!.setPosition(p.x+(q.x-p.x)*t,p.y+(q.y-p.y)*t).setDepth((t<0.5?a:b).depth+OCCUPANT_LAYER);
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
    },onComplete:finish});
    return {done,cancel:finish};
  }

  fit(width: number, height: number, panelBottom: number): void {
    // Responsive panel layout can precede Phaser's fullscreen resize event.
    // Do not mix its new DOM geometry with stale viewport dimensions: the
    // following scale resize fits the settled viewport with the original zoom.
    if (width !== window.innerWidth || height !== window.innerHeight) return;
    const layout = fitBoard(this.bounds, { width, height }, panelBottom);
    const viewportChanged = width !== this.viewport.width || height !== this.viewport.height;
    const zoom = this.view.scale / this.fitScale;
    this.viewport = { width, height };
    this.panelBottom = panelBottom;
    this.fitScale = layout.scale;
    // Panel text/layout changes are not navigation: retain the camera, clamping
    // only where the new available area or zoom limits require it. Real viewport
    // changes still refit the board and preserve relative zoom.
    this.applyView(viewportChanged ? { ...layout, scale: layout.scale * zoom } : this.view);
  }

  /** A fresh battle is centered after its initial automatic turns settle the HUD. */
  resetView(): void {
    this.applyView(fitBoard(this.bounds, this.viewport, this.panelBottom));
  }

  private applyView(view: View): void {
    this.view = constrainView(view, this.bounds, this.viewport, this.panelBottom, this.fitScale);
    this.root.setPosition(this.view.x, this.view.y).setScale(this.view.scale);
    this.layoutFeedback();
    this.publish();
  }

  private layoutFeedback():void {
    // Keep labels legible when the whole board is fitted into short mobile viewports.
    // Coordinates remain board-local, including the extra separation for defeat.
    const scale=Math.max(1,14/(18*this.view.scale));
    this.effectLabels.forEach(({text,anchor,kind},i)=>{
      text.setScale(scale);
      const height=text.height*scale;
      const y=kind==='guard'?anchor.y+height/2+6/this.view.scale
        :anchor.y-54-height/2-(kind==='defeat'?height+3/this.view.scale:0);
      text.setPosition(anchor.x,y);
      if(this.effect){this.effect.feedback[i].x=text.x;this.effect.feedback[i].y=text.y;}
    });
  }

  pan(dx: number, dy: number): boolean {
    const before = this.view;
    this.applyView({ ...before, x: before.x + dx, y: before.y + dy });
    return this.view.x !== before.x || this.view.y !== before.y;
  }

  zoom(factor: number, anchor: Point): boolean {
    const before = this.view;
    const point = screenToBoard(anchor, this.view);
    const scale = Math.max(this.fitScale, Math.min(this.fitScale * MAX_ZOOM, this.view.scale * factor));
    this.applyView({ x: anchor.x - point.x * scale, y: anchor.y - point.y * scale, scale });
    return this.view.scale !== before.scale || this.view.x !== before.x || this.view.y !== before.y;
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
      effect: this.effect,
      depthOrder: this.root.list.map(object => Number('depth' in object ? object.depth : 0)),
      surfaceCornerError: Math.max(...surfaceErrors),
      canopies: this.canopies.map(({ tile, graphics }) => ({ tile, depth: graphics.depth, alpha: graphics.alpha })),
      bounds: { left: x + this.bounds.left * scale, right: x + this.bounds.right * scale,
        top: y + this.bounds.top * scale, bottom: y + this.bounds.bottom * scale },
    });
  }
}
