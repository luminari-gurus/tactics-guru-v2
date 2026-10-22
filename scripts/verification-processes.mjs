import { readFileSync, readdirSync, readlinkSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

// Linux identity is (PID, start ticks), not PID alone. Never inspect environments
// or kill a port owner. A detached process is owned only by observed ancestry.
function identity(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return { pid: Number(pid), state: fields[0], parent: Number(fields[1]), start: fields[19] };
  } catch (error) {
    if (['ENOENT', 'ESRCH'].includes(error.code)) return null;
    throw error;
  }
}
const live = entry => entry && !['Z', 'X'].includes(entry.state);

export function trackOwnedProcesses(child) {
  const linux = process.platform === 'linux';
  const owned = new Map();
  const selfPid = linux ? Number(readlinkSync('/proc/self')) : process.pid;
  const translated = selfPid !== process.pid;
  const namespacePids = pid => readFileSync(`/proc/${pid}/status`, 'utf8').match(/^NSpid:\s+(.+)$/m)?.[1].trim().split(/\s+/).map(Number);
  const namespaceDepth = translated ? namespacePids(selfPid)?.length : null;
  function adopt(entry) {
    const ids = translated ? namespacePids(entry.pid) : null;
    if (translated && ids?.length !== namespaceDepth) throw Error('Owned process has an unsupported PID namespace');
    owned.set(entry.pid, { ...entry, signalPid: translated ? ids.at(-1) : entry.pid });
  }
  const diagnostics = { mode: linux ? 'linux-proc-ancestry' : 'process-group-best-effort',
    sampleIntervalMs: linux ? 100 : null, observed: [], escalated: [], survivors: [], errors: [], complete: false };
  if (!linux) diagnostics.limitation = 'Detached descendants cannot be verified on this platform.';
  const rememberError = error => {
    // A process can vanish between enumerating /proc and reading its identity.
    if (['ENOENT', 'ESRCH'].includes(error.code)) return;
    if (!diagnostics.errors.includes(error.message)) diagnostics.errors.push(error.message);
  };
  function sample() {
    if (!linux || !child.pid) return;
    try {
      const table = new Map();
      for (const pid of readdirSync('/proc').filter(name => /^\d+$/.test(name))) {
        const entry = identity(pid);
        if (entry) table.set(entry.pid, entry);
      }
      if (!owned.size) {
        const root = translated
          ? [...table.values()].find(entry => entry.parent === selfPid && namespacePids(entry.pid)?.at(-1) === child.pid)
          : table.get(child.pid);
        if (root) adopt(root);
      }
      let changed;
      do {
        changed = false;
        for (const entry of table.values()) {
          const parent = owned.get(entry.parent), currentParent = table.get(entry.parent);
          if (!owned.has(entry.pid) && parent && currentParent?.start === parent.start) {
            adopt(entry); changed = true;
          }
        }
      } while (changed);
    } catch (error) { rememberError(error); }
  }
  function remaining() {
    return [...owned.values()].filter(entry => {
      try { const current = identity(entry.pid); return live(current) && current.start === entry.start; }
      catch (error) { rememberError(error); return true; }
    });
  }
  function send(entries, signal) {
    for (const entry of entries.reverse()) {
      try {
        const current = identity(entry.pid);
        if (live(current) && current.start === entry.start) {
          process.kill(entry.signalPid, signal);
          if (signal === 'SIGKILL') diagnostics.escalated.push(entry.signalPid);
        }
      } catch (error) { if (error.code !== 'ESRCH') rememberError(error); }
    }
  }
  sample();
  const watcher = linux ? setInterval(sample, 100) : null;
  let cleanup;
  return {
    stop() {
      if (cleanup) return cleanup;
      cleanup = (async () => {
        sample();
        if (linux) {
          if (!owned.size && child.exitCode === null && child.signalCode === null) {
            rememberError(Error('Could not observe the launcher in /proc'));
            child.kill('SIGTERM');
          }
          const signaled = new Set();
          const deadline = performance.now() + 3000;
          let pending;
          do {
            sample(); pending = remaining();
            const fresh = pending.filter(entry => !signaled.has(entry.pid + ':' + entry.start));
            send(fresh, 'SIGTERM');
            fresh.forEach(entry => signaled.add(entry.pid + ':' + entry.start));
            if (!pending.length) break;
            await delay(50);
          } while (performance.now() < deadline);
          sample(); send(remaining(), 'SIGKILL');
          if (!owned.size && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
          const killDeadline = performance.now() + 2000;
          while (remaining().length && performance.now() < killDeadline) await delay(25);
          diagnostics.observed = [...owned.values()].map(({pid, parent, start, signalPid}) => ({pid, parent, start, signalPid}));
          diagnostics.survivors = remaining().map(entry => entry.pid);
          diagnostics.complete = diagnostics.survivors.length === 0 && diagnostics.errors.length === 0;
        } else if (child.pid) {
          const signal = sig => {
            try {
              if (process.platform === 'win32') child.kill(sig);
              else process.kill(-child.pid, sig);
            } catch (error) { if (error.code !== 'ESRCH') rememberError(error); }
          };
          signal('SIGTERM'); await delay(3000); signal('SIGKILL');
          // Group-only cleanup is explicitly unverified, never Linux proof.
          diagnostics.complete = null;
        } else diagnostics.complete = true;
        return diagnostics;
      })().finally(() => clearInterval(watcher));
      return cleanup;
    },
  };
}
