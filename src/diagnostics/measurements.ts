const MAX_FRAME_SAMPLES = 600;
const MAX_WINDOWS = 60;
const INTERACTION_WINDOW_MS = 250;
export type MeasurementAction = 'selection' | 'pan' | 'zoom' | 'move';
interface Workload { action: MeasurementAction; startedMs: number; untilMs: number; samples: number[] }
interface Response { action: MeasurementAction; inputMs: number; renderedMs: number; responseMs: number; renderedFrames: number }
function frameSummary(samples: readonly number[]) {
  const sorted = [...samples].sort((a,b)=>a-b);
  const percentile = (fraction: number) => sorted.length ? sorted[Math.ceil(sorted.length*fraction)-1] : null;
  return {count:sorted.length, medianMs:percentile(0.5), p95Ms:percentile(0.95), maxMs:sorted.at(-1) ?? null};
}

/** Navigation-relative milliseconds; a restart begins a fresh bounded sample. */
export class FitMeasurements {
  private run = 0;
  private started = 0;
  private ready: number | null = null;
  private usable: number | null = null;
  private previousFrame: number | null = null;
  private samples: number[] = [];
  private windows: Workload[] = [];
  private pending: {action: MeasurementAction; inputMs: number}[] = [];
  private responses: Response[] = [];

  constructor(private readonly sampleLimit = MAX_FRAME_SAMPLES) {}

  begin(now: number): void {
    this.run++;
    this.started = now;
    this.ready = this.usable = this.previousFrame = null;
    this.samples = [];
    this.windows = []; this.pending = []; this.responses = [];
  }

  sceneReady(now: number): void { this.ready ??= now; }
  controlsUsable(now: number): void { this.usable ??= now; }

  /** Inputs are recorded only after a visible presentation change was accepted. */
  interaction(action: MeasurementAction, now: number): void {
    if (this.usable === null) return;
    if (this.pending.length + this.responses.length < this.sampleLimit) this.pending.push({action, inputMs:now});
    this.workload(action, now);
  }

  workload(action: MeasurementAction, now: number, duration = INTERACTION_WINDOW_MS): void {
    const last = this.windows.at(-1);
    if (last?.action === action && last.untilMs >= now) last.untilMs = Math.max(last.untilMs, now + duration);
    else if (this.windows.length < MAX_WINDOWS) this.windows.push({action, startedMs:now, untilMs:now+duration, samples:[]});
  }

  rendered(now: number, visible: boolean): void {
    if (visible) for (const input of this.pending) this.responses.push({...input, renderedMs:now, responseMs:now-input.inputMs, renderedFrames:1});
    this.pending = [];
  }

  frame(now: number, visible: boolean, idle = true): void {
    if (!visible || this.usable === null) {
      this.previousFrame = null;
      this.pending = [];
      if (!visible) for (const window of this.windows) window.untilMs = Math.min(window.untilMs, now);
      return;
    }
    if (this.previousFrame !== null && now > this.previousFrame) {
      const windows = this.windows.filter(window => window.startedMs <= now && window.untilMs >= this.previousFrame!);
      if (windows.length) {
        for (const window of windows) if (window.samples.length < this.sampleLimit) window.samples.push(now-this.previousFrame);
      } else if (idle && this.samples.length < this.sampleLimit) this.samples.push(now-this.previousFrame);
    }
    this.previousFrame = now;
  }

  snapshot() {
    return {
      run: this.run,
      navigationStartMs: 0,
      sceneStartedMs: this.started,
      sceneReadyMs: this.ready,
      controlsUsableMs: this.usable,
      frames: frameSummary(this.samples),
      workloads: this.windows.map(window => ({action:window.action, startedMs:window.startedMs, untilMs:window.untilMs, frames:frameSummary(window.samples), intervalsMs:[...window.samples]})),
      interactions: this.responses.map(response=>({...response})),
    };
  }
}
