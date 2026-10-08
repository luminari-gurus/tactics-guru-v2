import { expect, test } from '@playwright/test';

test('square grass material projects all corners exactly onto the shared tile geometry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const asset = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/proof/grass-material-v1-348.png';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentSamples = 0;
    for (let y = 0; y < canvas.height; y += 16) {
      for (let x = 0; x < canvas.width; x += 16) {
        if (pixels[(y * canvas.width + x) * 4 + 3] !== 255) transparentSamples++;
      }
    }
    return { width: canvas.width, height: canvas.height, transparentSamples };
  });
  // 348 = ceil((80 + 2 × bleed) / √2 × 6 max board zoom × canvas density 1): the #35 export of the square material.
  expect(asset.width).toBe(348);
  expect(asset.width).toBe(asset.height);
  expect(asset.transparentSamples).toBe(0);
  // Phaser stores transform matrices as float32; 0.001 CSS pixel allows rounding, not visible drift.
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => window.fitDiagnostics().proof?.surfaceCornerError)).toBeLessThan(0.001);
  }
});
