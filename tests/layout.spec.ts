import { expect, test, type Page } from '@playwright/test';

// Safe-area insets resolve to 0 in Chromium emulation; notch and home-indicator spacing are physical
// checks in docs/qa/issue-19-lifecycle.md. Here: touch-target size, reachability, panel cap, canvas fit.
const VIEWPORTS = [
  { width: 390, height: 844, short: false },
  { width: 844, height: 390, short: true },
  { width: 360, height: 640, short: false },
  { width: 915, height: 412, short: true },
  { width: 1280, height: 720, short: false },
];
const CONTROLS = '#fit-panel button, #fit-panel select, #fit-panel summary, #fit-panel input[type="range"]';

interface Box { id: string; width: number; height: number; visible: boolean; disabled: boolean; }

async function controlBoxes(page: Page): Promise<Box[]> {
  return page.evaluate(selector => {
    for (const details of document.querySelectorAll<HTMLDetailsElement>('#fit-panel details')) details.open = true;
    const panel = document.querySelector('#fit-panel')!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(selector)].map(element => {
      element.scrollIntoView({ block: 'nearest' });
      const rect = element.getBoundingClientRect();
      const visible = rect.top >= panel.top - 1 && rect.bottom <= panel.bottom + 1 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
      return { id: element.id || element.textContent!.trim(), width: rect.width, height: rect.height, visible, disabled: (element as HTMLButtonElement).disabled === true };
    });
  }, CONTROLS);
}

for (const viewport of VIEWPORTS) {
  test(`controls stay at least 44 px and reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('Ready');
    await page.getByLabel('Move destination').selectOption('raised-front');
    await expect.poll(() => page.locator('canvas').evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      return Math.abs(rect.width - innerWidth) < 2 && Math.abs(rect.height - innerHeight) < 2;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const panel = await page.locator('#fit-panel').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, scrolls: element.scrollHeight > element.clientHeight + 1, overflowY: getComputedStyle(element).overflowY };
    });
    expect(panel.top).toBeGreaterThanOrEqual(12);
    expect(panel.overflowY).toBe('auto');
    if (viewport.short) expect(panel.bottom).toBeLessThanOrEqual(viewport.height * 0.55);
    else expect(panel.bottom).toBeLessThanOrEqual(viewport.height * 0.75);
    // Collapsed groups: their summaries are reachable before anything is opened.
    const summaries = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#fit-panel summary')].map(summary => {
      summary.scrollIntoView({ block: 'nearest' });
      const rect = summary.getBoundingClientRect();
      return { text: summary.textContent!.trim(), height: rect.height, inside: rect.top >= 0 && rect.bottom <= innerHeight };
    }));
    expect(summaries.map(summary => summary.text)).toEqual(['Board controls', 'Measurements']);
    for (const summary of summaries) { expect(summary.height).toBeGreaterThanOrEqual(44); expect(summary.inside, `${summary.text} summary`).toBe(true); }
    const boxes = await controlBoxes(page);
    const ids = boxes.map(box => box.id);
    for (const id of ['fit-restart', 'move-start', 'audio-play', 'move-destination', 'tree-opacity', 'fit-snapshot', 'Board controls', 'Measurements']) expect(ids).toContain(id);
    for (const box of boxes) {
      expect(box.height, `${box.id} height`).toBeGreaterThanOrEqual(44);
      if (box.id !== 'tree-opacity') expect(box.width, `${box.id} width`).toBeGreaterThanOrEqual(44);
      expect(box.visible, `${box.id} reachable after scrolling the panel`).toBe(true);
    }
    for (const id of ['fit-restart', 'move-start', 'audio-play']) expect(boxes.find(box => box.id === id)!.disabled, `${id} enabled`).toBe(false);
    // Reaching a control by scrolling the panel still lets it be used.
    await page.locator('#fit-snapshot').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Refresh measurements' }).click();
    expect(JSON.parse(await page.locator('#fit-report').innerText()).viewport).toEqual({ width: viewport.width, height: viewport.height, dpr: await page.evaluate(() => devicePixelRatio) });
    const board = await page.evaluate(() => window.fitDiagnostics().board!);
    const panelAfter = await page.locator('#fit-panel').evaluate(element => element.getBoundingClientRect().bottom);
    expect(board.bounds.top).toBeGreaterThanOrEqual(panelAfter);
    expect(board.bounds.bottom).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: test.info().outputPath(`layout-${viewport.width}x${viewport.height}.png`) });
    expect(errors).toEqual([]);
  });
}

test('page gestures are suppressed in CSS and the canvas has no context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  expect(await page.evaluate(() => ({
    body: getComputedStyle(document.body).overscrollBehavior,
    game: getComputedStyle(document.querySelector('#game')!).userSelect,
    panel: getComputedStyle(document.querySelector('#fit-panel')!).userSelect,
    report: getComputedStyle(document.querySelector('#fit-report')!).userSelect,
    canvas: getComputedStyle(document.querySelector('canvas')!).touchAction,
    button: getComputedStyle(document.querySelector('#audio-play')!).touchAction,
    select: getComputedStyle(document.querySelector('#move-destination')!).touchAction,
  }))).toEqual({ body: 'none', game: 'none', panel: 'none', report: 'text', canvas: 'none', button: 'manipulation', select: 'manipulation' });
  const box = (await page.locator('canvas').boundingBox())!;
  await page.evaluate(() => { window.addEventListener('contextmenu', event => { window.__contextMenu = event.defaultPrevented ? 'prevented' : 'allowed'; }, { once: true }); });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 20, { button: 'right' });
  await expect.poll(() => page.evaluate(() => window.__contextMenu)).toBe('prevented');
});

declare global { interface Window { __contextMenu?: string } }
