/** No timestamps survive this owner. A new process starts paused, at zero delta. */
export class ActivePlaytime {
  private previous: number | null = null;
  private remainder = 0;
  constructor(private readonly now: () => number = () => performance.now()) {}

  /** Close the previous interval, then choose whether the next interval is active. */
  sample(active = this.previous !== null): number {
    const current = this.now();
    if (!Number.isFinite(current)) { this.previous = null; return 0; }
    const elapsed = this.previous === null ? 0 : Math.max(0, current - this.previous);
    const next = this.previous === null ? current : Math.max(current, this.previous);
    this.previous = active ? next : null;
    const total = Math.min(Number.MAX_SAFE_INTEGER, elapsed + this.remainder);
    const whole = Math.floor(total); this.remainder = total - whole;
    return whole;
  }
}

/** The two journey shells supply gameplay eligibility; browser lifecycle is shared. */
export function observeActivePlaytime(update: (active: boolean) => void, eligible: () => boolean,
  beforeLeave?: () => void | boolean | Promise<void | boolean>) {
  let active = false, publishing = false, timer: ReturnType<typeof setInterval> | null = null;
  const set = (next: boolean) => {
    if (active !== next) {
      active = next; publishing = true;
      try { update(active); } finally { publishing = false; }
    }
    if (active && timer === null) timer = setInterval(() => { sync(); if (active) update(true); }, 5000);
    if (!active && timer !== null) { clearInterval(timer); timer = null; }
  };
  const sync = () => { if (!publishing) set(!document.hidden && document.hasFocus() && eligible()); };
  const pause = () => set(false);
  const navigate = async (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!beforeLeave || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      !link || link.hasAttribute('download') || link.target || new URL(link.href).origin !== location.origin) return;
    event.preventDefault();
    if (await beforeLeave() !== false) location.assign(link.href);
  };
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('focus', sync);
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', pause);
  document.addEventListener('click', navigate);
  return { sync, pause, dispose() {
    pause(); document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('focus', sync); window.removeEventListener('blur', pause);
    window.removeEventListener('pagehide', pause);
    document.removeEventListener('click', navigate);
  } };
}
