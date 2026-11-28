import type Phaser from 'phaser';

/** Bake the color into an opaque surface once per game so Canvas and WebGL draw the same texture. */
export function tintedTerrainSurface(textures: Phaser.Textures.TextureManager, sourceKey: string, tint: number): string {
  const key = `battle-surface-${sourceKey}-${tint.toString(16)}`;
  if (textures.exists(key)) return key;

  const source = textures.get(sourceKey).getSourceImage();
  if (!(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) {
    throw new Error(`Invalid terrain surface: ${sourceKey}`);
  }

  const surface = textures.createCanvas(key, source.width, source.height);
  if (!surface) throw new Error(`Could not create terrain surface: ${key}`);
  const context = surface.getContext();
  context.drawImage(source, 0, 0);
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
  context.fillRect(0, 0, source.width, source.height);
  context.restore();
  surface.refresh();
  return key;
}
