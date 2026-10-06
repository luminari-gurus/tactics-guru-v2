import { expect, test } from '@playwright/test';
import { PROOF_ART } from '../src/diagnostics/proofAssets';
import { TILE_WIDTH, TILE_HEIGHT } from '../src/geometry/iso';

test('grass uses a 2:1 frame and opaque coverage throughout each tile diamond', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const frame = PROOF_ART.grass.frame;
  expect.soft(frame.width / frame.height).toBe(TILE_WIDTH / TILE_HEIGHT);
  const uncovered = await page.evaluate(async ({ frame, width, height, bleed }) => {
    const image = new Image();
    image.src = '/proof/grass-surface.png';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    // One logical pixel of bleed on either horizontal side; exact geometry clips it.
    const displayWidth = width + bleed * 2;
    const displayHeight = displayWidth * height / width;
    const missing: { x: number; y: number; alpha: number }[] = [];
    for (let y = -height / 2; y <= height / 2; y++) {
      for (let x = -width / 2; x <= width / 2; x++) {
        if (Math.abs(x) / (width / 2) + Math.abs(y) / (height / 2) > 1) continue;
        const sourceX = Math.round(frame.x + frame.width / 2 + x * frame.width / displayWidth);
        const sourceY = Math.round(frame.y + frame.height / 2 + y * frame.height / displayHeight);
        const alpha = pixels[(sourceY * canvas.width + sourceX) * 4 + 3];
        if (alpha < 250) missing.push({ x, y, alpha });
      }
    }
    return missing;
  }, { frame, width: TILE_WIDTH, height: TILE_HEIGHT, bleed: PROOF_ART.grass.horizontalBleed });
  expect(uncovered.length, JSON.stringify(uncovered.slice(0, 5))).toBe(0);
});
