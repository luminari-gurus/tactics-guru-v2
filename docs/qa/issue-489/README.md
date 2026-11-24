# Issue 489 WebKit acceptance coverage

[Parallel run #68](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45419718975)
tested `10895b93bc53`. Its [WebKit receipt](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45419718975/artifacts/14934568705)
recorded 224 cases, with 218 passes, six existing skips, and zero retries.

Playwright discovery with one worker and zero configured retries retains 216 of
those exact IDs and adds none. Each omission below was a passing baseline case.
Project names use the `acceptance-webkit-` prefix.

| Case | Removed orientation and ID | Retained orientation and ID | Removed case time in #68 |
| --- | --- | --- | ---: |
| complete legal authored battle seed 2 reaches playerWin through controls and replays | portrait `048cec556759de4a1f3c-fa6cb6effd02b4b79a63` | landscape `048cec556759de4a1f3c-1075065ce1d7f5ec0c1d` | 31.458 s |
| complete legal authored battle seed 1 reaches playerLoss through controls and replays | landscape `048cec556759de4a1f3c-7a829993be174950e4f9` | portrait `048cec556759de4a1f3c-d4e7539308b7ce6a1a3f` | 54.037 s |
| testing routes: fresh play never accesses missing saved games | landscape `8352ba8e75a15b46318d-339f37b3f8546d9281a3` | portrait `8352ba8e75a15b46318d-c36978f47754645e4baa` | 18.269 s |
| testing routes: fresh play never accesses corrupt saved games | landscape `8352ba8e75a15b46318d-6afa3babbe4125bbb6ab` | portrait `8352ba8e75a15b46318d-574a0d5d23ac73bfe661` | 17.832 s |
| testing routes: fresh play never accesses backup-only saved games | landscape `8352ba8e75a15b46318d-38d0c8822a68708b43f3` | portrait `8352ba8e75a15b46318d-536b80aa955d95ae67f9` | 18.466 s |
| testing routes: fresh play never accesses unavailable saved games | landscape `8352ba8e75a15b46318d-2e93b02f40ddb18d936a` | portrait `8352ba8e75a15b46318d-c261f8c7f2279a93cf91` | 18.143 s |
| legal run outcomes, earned rewards and fresh restart | landscape `56e8b196f7ac6aaa7059-988d64980a0c2fe74416` | portrait `56e8b196f7ac6aaa7059-8ccc5213da8df4b277bd` | 91.425 s |
| testing routes: an earned combat draught stays in the transient authored run | landscape `56e8b196f7ac6aaa7059-1e9fbedbc0d7e7c803a0` | portrait `56e8b196f7ac6aaa7059-c4e69ba436b0fcf036f4` | 61.456 s |

Portrait keeps the full reward and restart journey and its board viewport
assertion. The focused run preparation and dialogs case passed in both baseline
orientations and remains in both. It checks 44 px controls, portrait and
landscape layout, native tap, and restart cancel/confirm. The full earned-draught
journey retains the storage-access spy, legal acquisition, consumption and
reload assertions.

Each authored battle keeps the full legal outcome, replay and restart checks.
Both orientations retain the focused keyboard decision flow, radial hold and tap
fallback, compact landscape controls, and HUD/camera reflow checks. The valid
fresh-play storage journey remains in both orientations. Portrait also runs
missing, corrupt, backup-only and unavailable storage with the same access
spy and byte-for-byte checks. The exclusions are confined to the WebKit
acceptance config.

The eight removed cases account for **311.086 s** of #68 case time.
The baseline WebKit browser stage took **23m 23s** on `unraid-tactics-02`,
with **1m 06s** of batch setup. The workflow completed in **38m 30s**.
The case-time sum is an estimate of removable execution time. Candidate stage,
runner compute and dispatch-to-result measurements come from the qualification run.
