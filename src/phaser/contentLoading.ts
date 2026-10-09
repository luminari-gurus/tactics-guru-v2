import type Phaser from 'phaser';
import type { ContentCatalog } from '../content/types';
import { validateContent } from '../content/validate';

export const CONTENT_LOAD_TIMEOUT_MS = 10000;

/** Validate unknown input before any references or texture keys reach Phaser. */
export function contentLoadPlan(input: unknown): ContentCatalog {
  const result = validateContent(input);
  if (!result.ok) throw new Error(`Invalid content: ${result.errors[0].path}: ${result.errors[0].message}`);
  return result.catalog;
}

/** Scene-owned, bounded load. No fallback texture can turn failure into readiness. */
export function loadContentAssets(scene: Phaser.Scene, catalog: ContentCatalog, ready: () => void, fail: (message: string) => void): void {
  let settled = false;
  const finish = (message?: string) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    scene.load.off('loaderror', onError);
    scene.load.off('complete', onComplete);
    if (message) fail(message); else ready();
  };
  const onError = (file: Phaser.Loader.File) => finish(`Asset load failed: ${file.key}`);
  const onComplete = () => {
    for (const asset of Object.values(catalog.assets)) {
      if (!scene.textures.exists(asset.id)) return finish(`Asset load failed: missing ${asset.id}`);
      const image = scene.textures.get(asset.id).getSourceImage();
      if (image.width !== asset.runtimeWidth || image.height !== asset.runtimeHeight) return finish(`Asset load failed: dimensions ${asset.id}`);
    }
    finish();
  };
  const timer = setTimeout(() => finish('Asset load failed: timeout'), CONTENT_LOAD_TIMEOUT_MS);
  scene.events.once('shutdown', () => {
    settled = true;
    clearTimeout(timer);
    scene.load.off('loaderror', onError);
    scene.load.off('complete', onComplete);
  });
  scene.load.on('loaderror', onError);
  scene.load.once('complete', onComplete);
  for (const asset of Object.values(catalog.assets)) scene.load.image(asset.id, asset.runtimePath, { responseType: 'blob', timeout: CONTENT_LOAD_TIMEOUT_MS });
  scene.load.start();
}
