# Standalone progression boundary

Date: 2026-10-25. Integrated base: main `e489a30`; branch merge parent
`04e9dbe28f2828c41bc4d8e0fb452b4f6b55a324`. Tested worktree source hashes are in
`prerequisite-source.json`. The only runtime edit projects level-1 abilities after
raw validation and uses the projected catalog for loading/session/storage. Raw
run/dungeon definitions remain available. No new ability is delivered by this chunk.

PR-readiness selection: this prerequisite reuses existing progression, affects only
standalone catalog construction and changes no domain or save contracts. Existing
level gating/locked-command units plus standalone startup/Continue and movement
through all three Chromium profiles bound its consumers. The dependent Fighter
implementation separately selects cross-route/full regression.

Commands and results (serial, one browser worker, Windows x64 Node 24.19.0):

- `npm run test:unit -- tests/unit/progression.test.ts tests/unit/battlePersistence.test.ts`:
  48 passed in 2 files. The executed command also named nonexistent
  `tests/unit/contentLoading.test.ts`; no coverage is attributed to that path.
- `npm run build`: 221 content tests passed in 8 files, both TypeScript scopes passed,
  production build passed. Existing Vite extension/chunk-size warnings retained.
- `npx --no-install playwright test tests/battle-persistence.spec.ts -g 'default Move Continue is read-only' --list`:
  discovered 3 cases; same command without `--list`, with JSON reporter: 3 passed,
  no failures/skips/retries (desktop, Pixel 7 touch portrait and landscape).
- Browser launch checks: Chromium 153.0.8010.12 and WebKit 26.6 passed. This chunk
  executes Chromium only; WebKit launch is not WebKit gameplay acceptance.
- `git diff --check` and OpenSpec strict validation passed before publication.

Setup failures preceded execution: npm was absent from PATH; inherited node_modules
had no Windows shims/native bindings; restored using unchanged-lockfile `npm ci`.
The default Chromium installation failed with `spawn UNKNOWN`; a task-local pinned
Chromium installation passed. These failures are not application test failures.
No dependencies/configuration changed. No physical-device or CI execution claimed.
Compressed logs/report and hashes retain the actual successful checks.
