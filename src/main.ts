import './style.css';
import { diagnosticsSnapshot, measurements } from './diagnostics/browser';

const container = document.querySelector<HTMLElement>('#game')!;
const statusLabel = document.querySelector<HTMLElement>('#fit-status')!;
const restartButton = document.querySelector<HTMLButtonElement>('#fit-restart')!;
const snapshotButton = document.querySelector<HTMLButtonElement>('#fit-snapshot')!;
const report = document.querySelector<HTMLElement>('#fit-report')!;
let restart: (() => void) | undefined;

function setStatus(state: 'loading' | 'ready'): void {
  statusLabel.textContent = state === 'ready' ? 'Ready' : 'Loading';
  container.dataset.ready = String(state === 'ready');
  container.dataset.run = String(measurements.snapshot().run);
  restartButton.disabled = state !== 'ready';
}

function showError(message: string): void {
  statusLabel.textContent = `Error: ${message}. Reload the page to retry.`;
  container.dataset.ready = 'false';
  restartButton.disabled = true;
}

// Application-owned controls are bound once, never on scene restart.
restartButton.addEventListener('click', () => {
  if (restartButton.disabled || !restart) return;
  setStatus('loading');
  try { restart(); } catch { showError('Could not restart the proof scene'); }
});
snapshotButton.addEventListener('click', () => { report.textContent = JSON.stringify(diagnosticsSnapshot(), null, 2); });
window.fitDiagnostics = diagnosticsSnapshot;
window.addEventListener('error', () => showError('The proof scene encountered a runtime error'));
window.addEventListener('unhandledrejection', () => showError('The proof scene encountered an asynchronous error'));

try {
  const { startProof } = await import('./phaser/start');
  restart = startProof(setStatus);
} catch {
  showError('Could not load or start Phaser');
}
