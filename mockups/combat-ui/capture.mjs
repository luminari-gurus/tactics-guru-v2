import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, 'previews');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu'],
});

async function shot(url, width, height, file, ready) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  if (ready) await ready(page);
  else await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, file), fullPage: false });
  await page.close();
  console.log('wrote', file);
}

const file = (name) => {
  const [path, query] = name.split('?');
  const q = new URLSearchParams(query || '');
  q.set('export', '1');
  return `file://${join(dir, path)}?${q}`;
};
for (const [page, desk, mob] of [
  ['current.html', 'current-desktop.png', 'current-mobile.png'],
  ['option-a.html', 'option-a-desktop.png', 'option-a-mobile.png'],
  ['option-b.html?state=move', 'option-b-desktop.png', 'option-b-mobile.png'],
  ['option-b.html?state=picker', 'option-b-picker-desktop.png', 'option-b-picker-mobile.png'],
  ['option-b-specials-target.html', 'option-b-specials-target-desktop.png', 'option-b-specials-target-mobile.png'],
  ['option-b-specials-segment.html', 'option-b-specials-segment-desktop.png', 'option-b-specials-segment-mobile.png'],
  ['option-b-specials-chips.html', 'option-b-specials-chips-desktop.png', 'option-b-specials-chips-mobile.png'],
  ['option-c.html', 'option-c-desktop.png', 'option-c-mobile.png'],
]) {
  await shot(file(page), 1440, 900, desk);
  await shot(file(page), 390, 844, mob);
}

if (process.env.LIVE_URL) {
  const live = async (page) => {
    await page.waitForSelector('#game[data-ready="true"], #dialog-confirm, #save-continue, #save-new, #battle-dialog', { timeout: 90_000 }).catch(() => {});
    const newBattle = page.locator('#save-new, button:has-text("New battle")').first();
    if (await newBattle.isVisible().catch(() => false)) await newBattle.click();
    const continueBtn = page.locator('#save-continue, button:has-text("Continue")').first();
    if (await continueBtn.isVisible().catch(() => false)) await continueBtn.click();
    await page.waitForSelector('#battle-move', { timeout: 90_000 });
    await page.waitForTimeout(800);
  };
  await shot(process.env.LIVE_URL, 1440, 900, 'live-desktop.png', live);
  await shot(process.env.LIVE_URL, 390, 844, 'live-mobile.png', live);
}

await browser.close();
