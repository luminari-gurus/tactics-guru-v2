# PR #209 tooling review (2026-10-22)

Reviewed source: `7770e55857a4dbee59cd16c4dc9de40b7fed3641` against main
`4f6614edee382def5f284a17e7f5872aafbbb02e`. Acceptance is limited to timing,
reporting, process lifecycle and manual CI tooling. Issues #200 and #220 remain
open; failed/incomplete baseline attempts remain failed/incomplete. The batch
manifest is a proposal, not implemented execution or qualified speedup evidence.

## Blocking finding repaired

P2: comparison used only project, file and short test title to identify selected
Playwright cases. Distinct nested suites can contain the same short title, so a
different selected case could produce no coverage warning. A reproduction with
different IDs and identical short titles returned zero warnings and a descriptive
-90% timing delta.

Comparison now uses the retained Playwright ID together with project. Reports
without IDs retain the historical file/title fallback. Regression contracts cover
changed IDs, unchanged selection, historical reports and project distinctions.
Timing deltas remain descriptive; coverage warnings do not establish equivalence.

## Fresh validation

- macOS, Node 24.19.0; dependency files copied into the isolated checkout from an
  existing installation with a byte-identical lockfile. No dependency changes.
- Tooling/reporting/process and orchestration contracts: 27 passed, zero failed,
  three Linux-only detached-process contracts skipped on macOS. This includes real
  browser-free Vitest and Playwright reporter runs and an interrupted reporter.
- CPU-only partial capture of tooling and both TypeScript scopes: complete,
  passed, inputs unchanged. The checkout contained the reviewed fix. Its
  self-comparison parsed as JSON, with zero warnings and zero deltas.
- Whitespace validation passed. No gameplay, build configuration, browser
  configuration, workflow, timeout, worker or retry setting changed.

Local receipts: `verification-receipts/timings/tooling-review/`. These are local
review evidence, not uploaded Actions artifacts or a comparable timing baseline.
The earlier self-hosted qualification remains evidence for unchanged Linux cleanup,
browser lifecycle and workflow behavior; it did not execute this comparison fix.
The changed comparison path has fresh local contracts and partial-report evidence.

No remaining blocking tooling finding was identified. No full matrix or new
browser capture was launched, and no merge was performed. Merge requires Brian's
approval; it must leave #200's baseline and #220's collector obligations open.
