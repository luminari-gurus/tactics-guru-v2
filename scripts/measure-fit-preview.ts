import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const workerPath = fileURLToPath(import.meta.url);

/** Private test seams; the collector always uses the defaults and fixed URL. */
type PreviewOptions = {
  url: string;
  cwd?: string;
  command?: string[];
  startupMs?: number;
  graceMs?: number;
};

export function ownedPreview(options: PreviewOptions) {
  const child = spawn(options.command?.[0] ?? process.execPath,
    options.command?.slice(1) ?? ['--experimental-strip-types', workerPath, '--preview-worker', options.url],
    { cwd: options.cwd, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let stdout = '', stderr = '', failure = '', bound = false, closed = false;
  let lastHttp = 'not probed (no bind acknowledgement)';
  let lastStatus: number | undefined;
  const deadline = performance.now() + (options.startupMs ?? 10000);
  const exited = new Promise<void>(done => child.once('close', () => { closed = true; done(); }));
  const onStdout = (chunk: Buffer) => { stdout = (stdout + chunk).slice(-8192); };
  const onStderr = (chunk: Buffer) => { stderr = (stderr + chunk).slice(-8192); };
  const onError = (error: Error) => { failure = error.message; };
  const onMessage = (message: unknown) => {
    if (typeof message !== 'object' || message === null) return;
    const data = message as { type?: string; error?: string };
    if (data.type === 'bound') bound = true;
    if (data.type === 'error') failure = String(data.error).slice(-8192);
  };
  child.stdout!.on('data', onStdout);
  child.stderr!.on('data', onStderr);
  child.on('error', onError);
  child.on('message', onMessage);
  const alive = () => !closed && child.exitCode === null && child.signalCode === null && !failure;
  const diagnostics = () => `pid=${child.pid ?? 'unavailable'} exit=${child.exitCode} signal=${child.signalCode}; ${failure || 'no child error'}; HTTP: ${lastHttp}; last status ${lastStatus ?? 'none'}\nstdout (tail): ${stdout}\nstderr (tail): ${stderr}`;
  let closing: Promise<void> | undefined;
  return {
    child,
    diagnostics,
    async ready(signal: AbortSignal) {
      try {
        while (performance.now() < deadline) {
          signal.throwIfAborted();
          if (!alive()) throw new Error('Preview exited or failed before readiness');
          if (bound) {
            const remaining = Math.max(1, Math.ceil(deadline - performance.now()));
            try {
              const response = await fetch(options.url, { signal: AbortSignal.any([signal, AbortSignal.timeout(Math.min(500, remaining))]) });
              lastStatus = response.status;
              lastHttp = `status ${response.status}`;
              // Do not retain a response body/socket after probing the document.
              await response.body?.cancel();
              if (response.ok && alive() && performance.now() < deadline) return;
            } catch (error) { lastHttp = String(error); }
          }
          await delay(Math.max(1, Math.min(50, deadline - performance.now())), undefined, { signal });
        }
        throw new Error('Preview readiness deadline exceeded');
      } catch (error) {
        const reason = signal.aborted ? signal.reason : error;
        throw new Error(`${reason instanceof Error ? reason.message : String(reason)}\n${diagnostics()}`, { cause: error });
      }
    },
    close() {
      return closing ??= (async () => {
        const wait = async (ms: number) => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try { await Promise.race([exited, new Promise<void>(done => { timer = setTimeout(done, ms); })]); }
          finally { clearTimeout(timer); }
        };
        try {
          if (!closed && child.connected) child.send({ type: 'close' }, error => { if (error && !closed) failure ||= error.message; });
          await wait(options.graceMs ?? 1000);
          if (!closed) { child.kill('SIGTERM'); await wait(500); }
          if (!closed) { child.kill('SIGKILL'); await wait(1000); }
          if (!closed) throw new Error(`Preview cleanup failed\n${diagnostics()}`);
        } finally {
          child.stdout!.off('data', onStdout);
          child.stderr!.off('data', onStderr);
          child.off('message', onMessage);
          child.off('error', onError);
        }
      })();
    },
  };
}

/** Own startup and the entire capture, including launch failure and interruption. */
export async function withPreview<T>(options: PreviewOptions & { remote: boolean }, capture: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const abort = new AbortController();
  if (options.remote) {
    const response = await fetch(options.url);
    await response.body?.cancel();
    if (!response.ok) throw new Error(`${options.url} answered ${response.status}`);
    return capture(abort.signal);
  }
  let preview: ReturnType<typeof ownedPreview> | undefined;
  const interrupt = (signal: string) => {
    abort.abort(new Error(`Collector interrupted by ${signal}`));
    // Close the preview even if Playwright is still launching its browser.
    void preview?.close().catch(() => { /* awaited below with the original failure */ });
  };
  const sigint = () => interrupt('SIGINT'), sigterm = () => interrupt('SIGTERM');
  process.on('SIGINT', sigint);
  process.on('SIGTERM', sigterm);
  let result: T | undefined, failure: unknown, failed = false;
  const previewExit = new Error('Preview exited during capture');
  const unexpectedExit = () => abort.abort(previewExit);
  try {
    preview = ownedPreview(options);
    await preview.ready(abort.signal);
    preview.child.once('exit', unexpectedExit);
    result = await capture(abort.signal);
    abort.signal.throwIfAborted();
  } catch (error) { failed = true; failure = error; }
  preview?.child.off('exit', unexpectedExit);
  let cleanupFailure: unknown, cleanupFailed = false;
  try { await preview?.close(); }
  catch (error) { cleanupFailure = error; cleanupFailed = true; }
  finally {
    process.off('SIGINT', sigint);
    process.off('SIGTERM', sigterm);
  }
  if (abort.signal.aborted) {
    const reason = abort.signal.reason;
    // Exit aborts capture immediately; close above drains the diagnostic pipes
    // (or reports bounded cleanup failure) before we snapshot their final tails.
    const primary = reason === previewExit
      ? new Error(`${previewExit.message}\n${preview?.diagnostics()}`, { cause: reason }) : reason;
    failure = failed && failure !== reason
      ? new AggregateError([primary, failure], `Capture aborted: ${String(primary)}; capture failed: ${String(failure)}`) : primary;
    failed = true;
  }
  if (cleanupFailed) {
    failure = failed ? new AggregateError([failure, cleanupFailure], `Capture failed: ${String(failure)}; cleanup failed: ${String(cleanupFailure)}`) : cleanupFailure;
    failed = true;
  }
  if (failed) throw failure;
  return result as T;
}

async function previewWorker() {
  let server: Awaited<ReturnType<typeof import('vite').preview>> | undefined;
  let stopping = false;
  let closing: Promise<void> | undefined;
  const close = async () => {
    stopping = true;
    if (server) await (closing ??= server.close());
    if (process.connected) process.disconnect?.();
  };
  process.on('message', message => { if ((message as { type?: string })?.type === 'close') void close(); });
  process.once('disconnect', () => { void close(); });
  try {
    const { preview } = await import('vite');
    const url = new URL(process.argv[3]);
    server = await preview({ preview: { host: url.hostname, port: Number(url.port), strictPort: true, open: false } });
    // preview() itself does not perform the CLI's missing-dist check.
    if (!(await stat(resolve(server.config.root, server.config.build.outDir))).isDirectory()) throw new Error('Missing production build directory');
    if (stopping || !process.connected) { await close(); return; }
    process.send!({ type: 'bound' });
  } catch (error) {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(detail);
    if (process.connected) process.send!({ type: 'error', error: detail });
    process.exitCode = 1;
    await close();
  }
}

if (process.argv[2] === '--preview-worker' && resolve(process.argv[1]) === workerPath) await previewWorker();
