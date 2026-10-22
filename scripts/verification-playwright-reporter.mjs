import { appendFileSync, writeFileSync } from 'node:fs';

// Append each callback synchronously, outside Playwright's disposable output.
// A timeout may lose the final JSON but not previously completed callback lines.
export default class VerificationPlaywrightReporter {
  constructor() { this.path = process.env.VERIFICATION_PLAYWRIGHT_EVENTS; }
  emit(event) { appendFileSync(this.path, JSON.stringify(event) + '\n'); }
  onBegin(config, suite) {
    writeFileSync(this.path, '', { flag: 'wx' });
    this.emit({ event: 'begin', planned: suite.allTests().length, workers: config.workers });
  }
  case(test, result) {
    return { id: test.id, title: test.titlePath().join(' > '), file: test.location.file,
      project: test.parent.project()?.name ?? null, retry: result.retry, worker: result.workerIndex };
  }
  onTestBegin(test, result) { this.emit({ event: 'testBegin', ...this.case(test, result) }); }
  onTestEnd(test, result) {
    this.emit({ event: 'testEnd', ...this.case(test, result), status: result.status,
      expectedStatus: test.expectedStatus, durationMs: result.duration,
      errors: result.errors.map(error => error.message ?? String(error)) });
  }
  onError(error) { this.emit({ event: 'error', message: error.message ?? String(error) }); }
  onEnd(result) { this.emit({ event: 'end', status: result.status, durationMs: result.duration }); }
}
