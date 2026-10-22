import { writeFileSync } from 'node:fs';

// Additional metadata absent from the built-in JSON reporter; enabled only by the timing runner.
export default class VerificationMetadataReporter {
  onInit(ctx) {
    this.path = process.env.VERIFICATION_VITEST_METADATA;
    this.data = { configuredWorkers: ctx.config.maxWorkers ?? null, pool: ctx.config.pool,
      fileParallelism: ctx.config.fileParallelism ?? null, retryAttempts: 0, diagnostics: [], peakConcurrentModules: 0 };
    this.activeModules = 0;
  }
  onTestModuleStart() {
    this.activeModules++;
    this.data.peakConcurrentModules = Math.max(this.data.peakConcurrentModules, this.activeModules);
  }
  onTestCaseResult(test) {
    const d = test.diagnostic();
    this.data.retryAttempts += d?.retryCount ?? 0;
  }
  onTestModuleEnd(module) {
    this.data.diagnostics.push({ file: module.moduleId, ...module.diagnostic() });
    this.activeModules--;
  }
  onTestRunEnd() {
    this.data.observedWorkers = new Set(this.data.diagnostics.map(d=>d.workerId).filter(id=>id!=null)).size;
    if (this.path) writeFileSync(this.path, JSON.stringify(this.data, null, 2)+'\n');
  }
}
