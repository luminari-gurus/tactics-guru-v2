# PR #209 self-hosted review qualification

PR #210 is merged and `unraid-tactics-01` is provisioned. PR #209 now integrates
main `4f6614edee382def5f284a17e7f5872aafbbb02e` (including #210 and #223) and PR
#222's owned-descendant cleanup/checkpoints. Compared with that main, it changes
no application/assets, lockfile, gameplay tests or browser configuration.

[Run 39763731799, attempt 1](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39763731799)
**passed** on the actual self-hosted runner, labels `[self-hosted, tactics-browser]`,
shared `tactics-browser-exclusive` concurrency. Tested checkout:
`07f75d4bd17908d8dc81dd4bb02c2d19439eb898`. The temporary trigger commit was
`cd9d762293d4026e044bee98aadaeb587afef90a`; checkout was pinned to the tested SHA.
The job ran 159 seconds (06:31:26–06:34:05 EDT on 2026-10-22).

- Node 24.22.1, Linux x64 kernel 6.8.0-139-generic; 6 reported CPUs, Ryzen 7 2700X,
  8,174,178,304 bytes RAM. Qualification did not establish idle host conditions.
- Locked dependency installation, unprivileged service-account browser cache
  installation and both launch preflights passed: Chromium 153.0.8010.12, WebKit 26.6.
- Timing/process/reporting contracts **18/18**, orchestration **10/10**, real
  diagnostics-retention contract **1/1**, preserving its intentional failure trace.
- Ordinary build passed **221 content cases**, both TypeScript scopes and Vite.
- Untraced Phaser boot/resize smoke passed **2/2**, Chromium + WebKit, one worker,
  zero retries/skips. Preview/dev timeout-recovery contracts passed **2/2**:
  completed case checkpoints survive cutoff, all owned processes disappear, and
  each fresh server can own port 4173 with stale reuse disabled. Two deliberately
  interrupted invocations remain timed-out receipts, not passing browser cases.
- A source-clean **partial** timing capture passed tooling and both type scopes,
  1,452 ms overall, with unchanged input hashes. It is not a full baseline.
  Comparison executed successfully. Its raw sidecar includes npm's stdout banner;
  final workflow uses `npm run --silent` to write machine-readable comparison JSON,
  verified with a local CPU-only capture and JSON parse (zero comparison deltas).

[30-day artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39763731799/artifacts/12419775881):
28 files, 439,902 bytes, SHA-256 downloaded and verified:
`da18b4eaa6f025b1fafe708e153f26ad72d0828dc078d92a2bdca2074819d664`.
Expires 2026-11-21 05:33:58 EST. [Compact metadata](self-hosted-qualification.json)
retains source/runner identity and timings. Raw receipts retain full input hashes,
actual browser executables, smoke reports, lifecycle/checkpoint reports and the
intentional diagnostics trace. Creation-to-job-start was 2 seconds; that interval
is not an isolated measured queue component. Setup/qualification is separate from
partial capture; no host-to-host speedup is claimed.

After qualification, the temporary maintainer-only PR label trigger was removed,
manual-only trusted dispatch restored, and the trigger label removed. That
restoration and evidence documentation leave tested runtime/test/package/config
hashes unchanged; the successful run did not execute the later restoration/docs
commits. No automatic self-hosted fork/PR execution, privileged OS installation or
GitHub-hosted fallback remains in the timing/lifecycle workflows.

PR #209 is ready for **tooling review**. The full comparable self-hosted baseline
and missing matrix coverage remain tracked by #200; #220's collector finding is
still open. The original 81.56-minute hosted failure stays failed/incomplete.
Passing these focused checks neither completes #200 nor supplies a passing full
regression matrix. Full captures remain deliberate manual operations; do not rerun
unchanged successful suites solely for nicer measurements.
