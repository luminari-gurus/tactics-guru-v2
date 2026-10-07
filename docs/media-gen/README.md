# Media generation references

These documents describe external services and sources that may be used, by
hand and before build, to create candidate assets for Tactics Guru v2. They
were adapted on 2026-10-07 from another project's references and rebound to
this repository's rules. None of them makes a service a dependency, and
nothing in the game, the build or the tests reads the keys they describe.

| Document | Covers | Project status |
| -- | -- | -- |
| [sound-fx-api.md](sound-fx-api.md) | ElevenLabs sound-effect generation | Candidate route for the twelve battle cues; not used by issue #19 |
| [text-to-speech.md](text-to-speech.md) | ElevenLabs text-to-speech, voices, dialogue | No speech is planned for the first slice; reference only |
| [musicapi-ai.md](musicapi-ai.md) | MusicAPI.ai Sonic music generation, task lifecycle, provenance | Candidate route for the one optional music track |
| [musicapi-ai-prompting.md](musicapi-ai-prompting.md) | Every Sonic create-request field and prompting practice | Provider reference; the project uses instrumental description mode only |
| [visuals-resources.md](visuals-resources.md) | CC0 and attribution-licensed art, texture and icon sites | Starting list; licences verified per asset, never per site |

## Rules that apply to every route

- **Keys.** `.env.example` lists the variable names with empty values. Real
  values live only in the ignored `.env`. Never put a key in source, tests,
  logs, screenshots, prompts, this folder, or a `VITE_` variable (Vite
  exposes those to the browser bundle).
- **Pre-build only.** The shipped game contains no SDK, key, endpoint,
  provider URL, telemetry or fallback for any of these services. Generation
  scripts run by hand on a developer machine and are not build dependencies.
  Nothing is required to run `npm ci`, `npm run build` or `npm test`.
- **Scratch.** Candidates go under the ignored `tmp/` directory with unique
  names. Nothing is copied into `public/` or `src/` by a script.
- **Formats.** The release allowlist is `.png .jpg .jpeg .webp .svg .ico`
  for images and `.mp3 .ogg .wav` for audio; compressed audio must be MP3
  because Ogg Vorbis cannot be relied on before iOS 18.4 and M4A is not
  allowed ([restart plan §5.1](../phaser4-restart-plan.md)). Ship one
  format per audio key. Whether very short cues ship as mono WAV is open
  question T11 ([tech design §12](../tech_design.phaser4.draft.md)).
- **Placement.** Shipped assets go through Vite's asset graph into
  `dist/assets/` via a manifest module (tech design §7.2). `public/proof/`
  is the diagnostic's asset folder and is not the game's.
- **Provenance is a gate.** Before any new file is committed: origin,
  licence, tool, exact prompt or source URL, edits and commands, bytes and
  SHA-256 are recorded in a QA note in the shape of
  [`docs/qa/issue-16-assets.md`](../qa/issue-16-assets.md) (later, a
  manifest row), and the owner signs off (restart plan D3). The repository
  is public and has no LICENSE file, so a commit publishes the asset.
- **Rights.** Original prompts only: no artist, franchise, song, branded
  sound or third-party character. Never upload legacy audio or art as a
  source; it has no recorded licence. Confirm a paid, commercial-use
  entitlement for a provider before anything it produced may ship.
- **Scope.** The first slice needs a small SFX set (tech design §7.4 cue
  table), a mute control, and at most one optional music track loaded last.
  No speech, ambience or adaptive music. Issue #19's unlock tone is made
  with ffmpeg, not with a service
  ([plan D-A](../ongoing-projects/issue-19-audio-lifecycle-plan.md)).
- **Tools on the host.** ffmpeg 8.1.1 and Node 24 are installed on the
  development machine. The repository requires Node 22.12 or newer; the
  Node examples use built-in `fetch` and need no SDK.

## Reverification

Each document carries its own "Last verified" line and source list.
Provider endpoints, model lists, prices and terms change without notice;
recheck them immediately before any live run whose output may ship.
