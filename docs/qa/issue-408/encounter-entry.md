# Issue #408 increment 1: encounter entry verification

## Scope and source

Verified on 2026-11-14 against the encounter-origin increment based on
`75f3bf7a6494f881f956b972f78dcf706cdc9e96`. The tested working tree contained
the increment's uncommitted changes; this report does not identify them as a
published commit. This increment retains the existing reward picker. Ground
loot, pickup, preferences and automatic post-victory movement remain later work.

## Browser evidence

The focused suite passed **15/15** after the final browser-helper change.
The complete first-floor journey separately passed on all three profiles,
giving **18 passing scenario/profile executions** for the affected behavior.
An earlier execution of the same focused suite also passed 15/15; it is not
counted again in that total.

| Scenario | Desktop WebKit | iPhone portrait | iPhone landscape |
| --- | --- | --- | --- |
| Real traversal, art changes, keyboard locks, active battle and reload | Passed | Passed | Passed |
| Guardian-first encounter entry and active resume | Passed | Passed | Passed |
| All three wandering encounter slots retain origin/contact, unchanged discovery and exact reload | Passed | Passed | Passed |
| Previous-format dungeon recovery preserves and exports both original slots | Passed | Passed | Passed |
| Read-only entry, new dungeon, real action and active-battle resume | Passed | Passed | Passed |
| Complete saved first floor: three legal victories, preparation/rewards, descent, ascent, carry and records | Passed | Passed | Passed |

Browser execution used WebKit 27.2 / Playwright 1.64.1 (revision 2370),
Node 24.22.1, Linux x86_64, the ordinary production preview at `/`, one worker
and zero retries. These are browser/device-emulation results, not physical-device
results. Existing downloaded WebKit and its extracted shared libraries were used.
Playwright's host-library cache check was disabled because its `ldconfig` check
does not see the supplied `LD_LIBRARY_PATH`; the real browser launched and ran
every listed case.

The focused suite used `playwright.exploration.config.ts` with this title filter:

```sh
npx --no-install playwright test -c playwright.exploration.config.ts \
  --grep 'read-only entry, keyboard new dungeon, real action and active resume|closing on each wandering encounter|walking onto a guardian|dungeon previous-format recovery|real traversal, art independence'
```

The complete-journey evidence predates only the test routing helper's bounded
interception fallback. That helper lets legal test input intercept a circling
enemy when the ordinary greedy route repeats its spatial state; it does not
mutate the game or alter application behavior. The final focused suite exercises
the updated helper. The added rejection of statistics-version-1 data in the new
format-18 envelope also does not affect the valid saved states in these journeys.
Final source/build qualification is recorded separately below.

## Preserved failures and limits

The additional `menu dungeon restores Mage XP 0, caster level and exact active
boundary` check failed on all three profiles. Its whole-snapshot assertion
expects an untracked fixture to remain byte-for-byte unchanged after reload,
but normal playtime checkpointing adds a `since-upgrade` statistics object.
The observed difference contains statistics only; the test's failure prevents
claiming that this additional check passed.

A clean, isolated worktree at the exact base
`75f3bf7a6494f881f956b972f78dcf706cdc9e96` was built and the same desktop WebKit
case reproduced the same failure at `tests/dungeon.spec.ts:85`. No unrelated
assertion or application change was made to suppress it. The original
six-case follow-up therefore remains **3 passed / 3 failed**, accompanied by
the separate **1 failed** exact-base comparison.

Local Chromium could not launch: its process-singleton socket failed with
`Operation not permitted`. This is an environment limitation; no local Chromium
acceptance is claimed. Repository CI retains its normal Chromium responsibility.

## Unit and final build qualification

- Final fast unit run: **1,378 passed across 77 files**. This includes 15 new
  encounter-entry/compatibility/storage cases. The initial run's three failures
  were an obsolete moved-position assertion and two greedy test-route cycles;
  corrected assertions and bounded legal interception passed the focused 77-case
  rerun and the final complete fast suite.
- Both TypeScript scopes and the production build passed after the application
  source was frozen. Content validation passed as part of that build.
- Root and prefix build integration: **2 passed**.
- Independent source review found no actionable issue in the origin/contact,
  legacy-save or backup/readback changes.

The first increment intentionally retains the reward picker while changing its
spatial boundary. Ground-loot generation/pickup, presentation, preference and
automatic movement remain subsequent increments of #408; this PR does not close
the issue. Standalone and short-run reward/session code is unchanged.
