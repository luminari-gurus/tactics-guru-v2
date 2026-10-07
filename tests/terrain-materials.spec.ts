import { expect, test } from '@playwright/test';
import { TERRAIN_MATERIALS } from '../src/terrain/materials';

test('every terrain source decodes as an opaque square and maps to a rendered tile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  for (const material of TERRAIN_MATERIALS) {
    const dimensions = await page.evaluate(async url => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = true;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) { opaque = false; break; }
      return { width: canvas.width, height: canvas.height, opaque };
    }, material.url);
    expect(dimensions.width, material.id).toBe(dimensions.height);
    expect(dimensions.width).toBeGreaterThanOrEqual(256);
    expect(dimensions.opaque, material.id).toBe(true);
  }
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.surfaceCornerError)).toBeLessThan(0.001);
  await page.screenshot({ path: test.info().outputPath('terrain-board.png') });
});
