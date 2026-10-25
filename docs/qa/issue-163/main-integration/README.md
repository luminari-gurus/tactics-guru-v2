# Current-main automatic stair integration

Main advanced during qualification to `d5b1927` (merged #243). It composes stair
entry and travel into one spatial revision, persists the candidate before
publication and removes manual stair buttons. The update was merged normally
through each dependency branch and into the requested Fighter branch. Test code
now follows automatic descent. This addendum supersedes the earlier final-build
pointer; the tested clean production build is **`a74d85e`**.

The delta is bounded to dungeon spatial publication/UI and its helpers. Battle
rules, RNG, Fighter profiles/effects, command admission, save schemas, assets,
dependencies, battle rendering, telemetry and non-dungeon routes are unchanged.
The upstream exact-source #230 control evidence remains in
`docs/qa/issue-230-auto-stairs.md`; no broader matrix is restarted for this merge.

Verification on the integrated source:

- Full units: **971 passed in 55 files**, no skips; both TypeScript scopes passed.
- Root bundle and both root/prefix build integrations: passed (**2 build cases**).
- Focused automatic-stair/healed-party, legal guardian/revisit and uncertain-save
  recovery cases: **9 Chromium + 9 WebKit passed**, across desktop/portrait/landscape,
  no skips/retries. Each new cross-feature case derives a legal spent-heal victory
  from the retained UI trace, checks unchanged party HP/progression/inventory,
  one revision per stair entry, exact reload, and fresh 1/1 Second Wind in the
  next encounter. It does not claim its structural spatial approach was a prior
  full playthrough.
- Updated complete production journey: **1 desktop case passed**, all six
  encounters/365 combat commands enacted through the UI with automatic descent.
  Every final battle state and accepted event sequence, including RNG, matches
  the earlier six-profile evidence exactly; final party progression also matches.
  World revision changes **431 → 430**, as intended by one-revision automatic travel.
  Unchanged combat/device coverage reuses the earlier five other complete journeys;
  the changed stair boundary itself is exercised in all six engine/device profiles.
- Final isolated proof capture: **18 cold/warm samples**, no failures, served
  build `a74d85e`. This is not a new #200 comparable baseline.

Commands use `npm run test:unit`, `npm run typecheck`, `npm run build:bundle`,
`npm run test:build`, the existing dungeon file with title filter
`automatic stairs preserve healed Fighter|legal reward and guardian boundaries|corrupt bytes stay exportable`
on the default and exploration configs, the complete Fighter journey on desktop,
and `npm run measure:fit -- tmp/issue-163-full/main-performance.json`.
The actual selectors, results, source/build inventory, trace, hashes and
representative fresh-resource screenshots are retained alongside this document.
Earlier failed aggregates remain unchanged and are reconciled in the parent QA.
