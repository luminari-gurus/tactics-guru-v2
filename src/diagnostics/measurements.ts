const MAX_FRAME_SAMPLES = 600;

/** Navigation-relative milliseconds; a restart begins a fresh bounded sample. */
export class FitMeasurements {
  private run = 0;
  private started = 0;
  private ready: number | null = null;
  private usable: number | null = null;
  private previousFrame: number | null = null;
  private samples: number[] = [];

  constructor(private readonly sampleLimit = MAX_FRAME_SAMPLES) {}

  begin(now: number): void {
    this.run++;
    this.started = now;
    this.ready = this.usable = this.previousFrame = null;
    this.samples = [];
  }

  sceneReady(now: number): void { this.ready ??= now; }
  controlsUsable(now: number): void { this.usable ??= now; }

  frame(now: number, visible: boolean): void {
    if (!visible || this.usable === null) {
      this.previousFrame = null;
      return;
    }
    if (this.previousFrame !== null && now > this.previousFrame && this.samples.length < this.sampleLimit) {
      this.samples.push(now - this.previousFrame);
    }
    this.previousFrame = now;
  }

  snapshot() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const percentile = (fraction: number): number | null => sorted.length ? sorted[Math.ceil(sorted.length * fraction) - 1] : null;
    return {
      run: this.run,
      navigationStartMs: 0,
      sceneStartedMs: this.started,
      sceneReadyMs: this.ready,
      controlsUsableMs: this.usable,
      frames: { count: sorted.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: sorted.at(-1) ?? null },
    };
  }
}
