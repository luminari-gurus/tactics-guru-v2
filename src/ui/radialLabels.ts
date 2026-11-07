export const RADIAL_LABEL_MIN_PX = 10;
export const RADIAL_LABEL_MAX_PX = 16;

export function stripUnavailablePrefix(text: string): string {
  return text.replace(/^Unavailable:\s*/i, '').trim();
}

export function uniqueHubLines(label: string, detail: string, reason: string | null, disabled: boolean): { title: string; subtitle: string } {
  const title = label.trim();
  const subtitle = stripUnavailablePrefix(disabled ? (reason ?? detail) : detail);
  if (!subtitle || subtitle.toLowerCase() === title.toLowerCase()) return { title, subtitle: '' };
  return { title, subtitle };
}

/** Binary-search a font size that no longer overflows. Returns minPx if it still overflows there. */
export function fontSizeToFit(overflows: (px: number) => boolean, minPx = RADIAL_LABEL_MIN_PX, maxPx = RADIAL_LABEL_MAX_PX): number {
  if (!overflows(maxPx)) return maxPx;
  if (overflows(minPx)) return minPx;
  let lo = minPx, hi = maxPx, best = minPx;
  while (hi - lo > 0.25) {
    const mid = (lo + hi) / 2;
    if (overflows(mid)) hi = mid;
    else { best = mid; lo = mid; }
  }
  return best;
}

function singleLineOverflows(node: HTMLElement, maxPx: number): boolean {
  node.style.whiteSpace = 'nowrap';
  if (!node.clientWidth) return false;
  const text = document.createRange();
  text.selectNodeContents(node);
  const size = fontSizeToFit(px => {
    node.style.fontSize = `${px}px`;
    // scrollWidth is integer-rounded and can miss subpixel clipping/ellipsis.
    return text.getBoundingClientRect().width > node.clientWidth - 1;
  }, RADIAL_LABEL_MIN_PX, maxPx);
  node.style.fontSize = `${size}px`;
  return text.getBoundingClientRect().width > node.getBoundingClientRect().width;
}

/** Fit one line where possible. Wrap long titles and drop overflowing secondary copy. */
export function fitRadialLabels(root: HTMLElement): void {
  for (const node of root.querySelectorAll<HTMLElement>('strong, span')) {
    if (node.closest('[hidden]') || !node.textContent?.trim()) continue;
    const title = node.tagName === 'STRONG';
    if (!singleLineOverflows(node, title ? RADIAL_LABEL_MAX_PX : 12)) continue;
    if (title) {
      node.style.whiteSpace = 'normal';
      node.style.overflowWrap = 'anywhere';
    } else {
      node.textContent = '';
    }
  }
  const hub = root.querySelector<HTMLElement>('#battle-radial-hub');
  const hubSpan = hub?.querySelector('span');
  if (hub && hubSpan && hub.scrollHeight > hub.clientHeight + 1) hubSpan.textContent = '';
}
