import Phaser from 'phaser';
import { battleCatalog } from '../content/catalog';
import type { ContentCatalog } from '../content/types';
import { FIRST_MAP_TERRAIN_IDS, TERRAIN_TEXTURE_SPEC } from '../content/constants';
import { boardBounds, fitBoard, projectTile, tileFaces, TILE_HEIGHT, TILE_WIDTH } from '../geometry/iso';
import { contentLoadPlan, CONTENT_LOAD_TIMEOUT_MS, loadContentAssets } from './contentLoading';

/** Ten adjacent ground surfaces only: no authored-board renderer, picking, or canopy. */
export class ContentSmokeScene extends Phaser.Scene {
  constructor(private readonly status: (state: 'loading' | 'ready' | 'error') => void, private readonly error: (message: string) => void) { super('ContentSmoke'); }

  create(): void {
    void this.begin().catch(error => this.error(error instanceof Error ? error.message : 'Content loading failed'));
  }

  private async begin(): Promise<void> {
    this.status('loading');
    let input: unknown = battleCatalog;
    if (new URLSearchParams(location.search).has('contentFixture')) {
      const response = await fetch('/battle/content-fixture.json', { signal: AbortSignal.timeout(CONTENT_LOAD_TIMEOUT_MS) });
      if (!response.ok) throw new Error('Invalid content: fixture could not load');
      input = await response.json();
    }
    const catalog = contentLoadPlan(input);
    loadContentAssets(this, catalog, () => {
      try { this.draw(catalog); this.status('ready'); }
      catch (error) { this.error(error instanceof Error ? error.message : 'Content surface failed'); }
    }, this.error);
  }

  private draw(catalog: ContentCatalog): void {
    const tiles = FIRST_MAP_TERRAIN_IDS.flatMap((terrain, y) => [0, 1].map(x => ({ x, y, elevation: 0, terrain })));
    const root = this.add.container();
    const surfaces = tiles.map(tile => {
      const point = projectTile(tile);
      const surface = this.add.container(point.x, point.y).setScale(1, TILE_HEIGHT / TILE_WIDTH);
      const key = catalog.terrains[tile.terrain].surfaceAssetId;
      const image = this.add.image(0, 0, key).setDisplaySize(TILE_WIDTH / Math.SQRT2, TILE_WIDTH / Math.SQRT2).setRotation(Math.PI / 4);
      surface.add(image);
      root.add(surface);
      return { tile, image, key };
    });
    const fit = () => {
      const layout = fitBoard(boardBounds(tiles), this.scale, document.querySelector('#fit-panel')!.getBoundingClientRect().bottom);
      root.setPosition(layout.x, layout.y).setScale(layout.scale);
      const half = TERRAIN_TEXTURE_SPEC.runtimeWidth / 2;
      const corners = [{ x: -half, y: -half }, { x: half, y: -half }, { x: half, y: half }, { x: -half, y: half }];
      const matrix = root.getWorldTransformMatrix();
      const errors = surfaces.flatMap(({ tile, image }) => tileFaces(tile).top.map((point, i) => {
        const actual = image.getWorldTransformMatrix().transformPoint(corners[i].x, corners[i].y);
        const expected = matrix.transformPoint(point.x, point.y);
        return Math.hypot(actual.x - expected.x, actual.y - expected.y);
      }));
      const edgeErrors = FIRST_MAP_TERRAIN_IDS.flatMap((_, y) => {
        const left = surfaces[y * 2].image.getWorldTransformMatrix();
        const right = surfaces[y * 2 + 1].image.getWorldTransformMatrix();
        return [[1, 0], [2, 3]].map(([a, b]) => {
          const p = left.transformPoint(corners[a].x, corners[a].y);
          const q = right.transformPoint(corners[b].x, corners[b].y);
          return Math.hypot(p.x - q.x, p.y - q.y);
        });
      });
      document.querySelector<HTMLElement>('#game')!.dataset.contentReport = JSON.stringify({
        viewport: { width: this.scale.width, height: this.scale.height }, assets: Object.keys(catalog.assets), surfaces: surfaces.map(({ tile, key }) => ({ ...tile, key })),
        cornerError: Math.max(...errors), adjacentEdgeError: Math.max(...edgeErrors),
        orientation: 'image-up to diamond top-right edge',
      });
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));
  }
}
