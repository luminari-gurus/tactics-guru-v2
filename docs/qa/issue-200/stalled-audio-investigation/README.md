# Proof audio restart cleanup — #200 investigation

Main was refreshed to `f33e31a` after PR #231. The original full run [39952038146](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39952038146) remains failed: its landscape stalled-tone case stayed Loading after 20 seconds. That exact unavailable-state timeout did not reproduce in three isolated unchanged-main cases or the seven-case landscape audio family. Do not claim its cause has been proven or that the historical failure is erased.

## Demonstrated defect and repair

Request observations exposed a specific restart leak. The original run's MP3 XHR remained alive after restart and retried at approximately 5 and 10 seconds through the scene's reused loader. Six MP3 requests were sent across the two runs rather than one canceled request plus the new run's three attempts. Phaser 4.2.1 LoaderPlugin.shutdown/reset clears its queues but does not abort those XHRs; File.resetXHR also does not clear the timeout callback.

FitScene now retains only its own queued proof-audio files. On shutdown it detaches pending XHR load/error/progress/timeout callbacks and aborts those requests. Completed requests are left alone. No shared loader, battle/run/dungeon audio, asset, dependency, retry, timeout or performance-budget behavior changes.

The existing stalled-tone test observes real XHR events without changing requests/responses, retains those events, and additionally asserts cancellation of the old run, no old timeout and exactly four MP3 sends across both runs. All original board-readiness, restart, unavailable-status, disabled-control, cache and no-play assertions remain. The original 20-second assertion and loader retries are unchanged.

## Evidence

All browser runs used the qualified `unraid-tactics-01` runner, shared exclusive browser lock, one worker, zero retries, Node 24.22.1, Playwright 1.63.0 / Chromium 153.0.8010.12, ordinary root preview and retained failure traces. Diagnostic repetitions are explicit independent cases, not automatic retries. Persistent caches and unrelated host workloads were not independently controlled. See [evidence.json](evidence.json) for exact source commits, report hashes, source-clean states, outcomes and 30-day artifact links (expire November 22, 2026).

| Check | Result |
| --- | --- |
| Unchanged-main original landscape case, three repetitions | 3 passed; original timeout not reproduced |
| Unchanged application, landscape audio family with request observations | 7 passed; leaked retired-run retries observed |
| New cancellation assertion on unchanged application | 3 failed: expected one old-request abort, observed zero |
| Repaired audio + lifecycle files on all three Chromium profiles | 32 passed, 1 initial desktop readiness failure, zero skips/retries |
| Repaired desktop initial-readiness case, three focused repetitions | 3 passed |
| Exact-main desktop initial-readiness comparison, three repetitions | 2 passed, 1 failed at the same Ready-versus-Loading assertion |

The repaired stalled-tone case passed on desktop, portrait and landscape; attached events show one retired-request abort, zero retired-request timeouts and only the new run's three attempts. Original and current audio/lifecycle selection contain the same 33 IDs, with zero missing/extra selections.

The initial desktop failure occurs before scene restart and matches a fresh unchanged-main failure at `tests/audio.spec.ts:23`. It is a separate existing intermittent initial-readiness problem, preserved with traces; its cause is not fixed here. Reusing the other 32 passing cases with the later focused startup result is not a claim of one clean 33-case run. No full baseline or unrelated suites were repeated.

Local validation passed 12 audio-state unit tests, both TypeScript scopes and both root/prefix build integrations. Self-hosted builds passed 221 content cases, both TypeScript scopes and ordinary bundling. Application, audio assets, dependencies, browser configuration and product limits outside proof-scene cleanup are unchanged; unrelated gameplay evidence is retained from #200, not represented as freshly rerun.

Temporary exact-branch manual workflow changes were used to pin and run the focused comparisons. The final workflow is restored byte-for-byte to main. Documentation and restoration commits do not alter the qualified runtime/test inputs. One abbreviated-SHA setup failure, two zero-test selector failures and one canceled pending run are also retained in the evidence ledger; none count as browser results.

## Disposition

This proves and repairs stale audio-XHR ownership at the restart boundary. It does not prove that ownership leak caused the original 20-second unavailable-status failure. Keep #200's original failed capture and uncertainty visible during closeout; track the independently reproduced initial-readiness flake separately from this bounded repair. No merge, deployment, physical-device result or clean full-regression pass is claimed.
