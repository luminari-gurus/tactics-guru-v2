/** One ephemeral post-victory action. Never restored from a save or restarted by rendering. */
export class DelayedDungeonStep {
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  constructor(private readonly delay = 400) {}

  cancel() {
    this.generation++;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  schedule(run: (isCurrent: () => boolean) => Promise<unknown> | unknown) {
    this.cancel();
    if (this.disposed) return;
    const generation = this.generation;
    const isCurrent = () => !this.disposed && generation === this.generation;
    let fired = false;
    this.timer = setTimeout(() => {
      if (fired || !isCurrent()) return;
      fired = true;
      this.timer = undefined;
      // Keep the token current while the owner's exclusive-save callback waits.
      // Fresh interaction can invalidate it before that callback publishes a step.
      void Promise.resolve().then(() => isCurrent() ? run(isCurrent) : undefined).catch(() => {
        // An optional automatic action is never retried after an unexpected error.
      }).finally(() => { if (isCurrent()) this.generation++; });
    }, this.delay);
  }

  dispose() { this.disposed = true; this.cancel(); }
}
