import { expect, type Page } from '@playwright/test';

/** Read geometry without the automatic scrolling performed by locator input. */
export async function dungeonMovementGeometry(page: Page, checkPlayer = true) {
  return page.locator('.dungeon-directions').evaluate((group, requirePlayer) => {
    const rect = (node: Element) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const visual = window.visualViewport;
    const screen = document.querySelector<HTMLElement>('#dungeon-screen')!;
    const screenBox = rect(screen);
    const viewport = {
      left: Math.max(visual?.offsetLeft ?? 0, screenBox.left),
      top: Math.max(visual?.offsetTop ?? 0, screenBox.top),
      right: Math.min((visual?.offsetLeft ?? 0) + (visual?.width ?? innerWidth), screenBox.right),
      bottom: Math.min((visual?.offsetTop ?? 0) + (visual?.height ?? innerHeight), screenBox.bottom),
    };
    const inside = (box: ReturnType<typeof rect>, clip = viewport) =>
      box.left >= clip.left - .1 && box.top >= clip.top - .1 && box.right <= clip.right + .1 && box.bottom <= clip.bottom + .1;
    const issues: string[] = [];
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('button')].map(button => {
      const box = rect(button), x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
      if (box.width < 44 || box.height < 44) issues.push(`${button.id}: target smaller than 44px`);
      if (!inside(box)) issues.push(`${button.id}: outside visible viewport`);
      if (![[0, 0], [20, 0], [-20, 0], [0, 20], [0, -20]].every(([dx, dy]) => button.contains(document.elementFromPoint(x + dx, y + dy)))) {
        issues.push(`${button.id}: target is clipped or occluded`);
      }
      return { id: button.id, disabled: button.disabled, x, y, ...box };
    });
    if (buttons.length !== 4) issues.push(`Expected four direction buttons, got ${buttons.length}`);
    const region = group.querySelector<HTMLElement>('.dungeon-map-viewport')!;
    const regionBox = rect(region);
    const clip = {
      left: Math.max(viewport.left, regionBox.left + region.clientLeft),
      top: Math.max(viewport.top, regionBox.top + region.clientTop),
      right: Math.min(viewport.right, regionBox.left + region.clientLeft + region.clientWidth),
      bottom: Math.min(viewport.bottom, regionBox.top + region.clientTop + region.clientHeight),
    };
    if (clip.right <= clip.left || clip.bottom <= clip.top) issues.push('Map viewport is not visible');
    const player = region.querySelector<HTMLElement>('[data-player]');
    if (requirePlayer) {
      if (!player) issues.push('Missing player marker');
      else {
        const box = rect(player);
        if (!inside(box, clip)) issues.push('Player marker is outside the visible map');
        if (!player.contains(document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2))) issues.push('Player marker is occluded');
      }
    }
    if (screen.scrollWidth > screen.clientWidth) issues.push('Exploration page overflows horizontally');
    return { issues, buttons, scrollTop: screen.scrollTop, mapScroll: { left: region.scrollLeft, top: region.scrollTop } };
  }, checkPlayer);
}

/** Must run before input: locator.tap/click/focus can otherwise conceal an offscreen-control bug. */
export async function expectDungeonMovementVisible(page: Page, checkPlayer = true) {
  await expect.poll(async () => (await dungeonMovementGeometry(page, checkPlayer)).issues).toEqual([]);
  return dungeonMovementGeometry(page, checkPlayer);
}
