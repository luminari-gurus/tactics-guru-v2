# MusicAPI.ai instrumental-music API

> **Credential boundary:** `MUSIC_API_KEY` in the ignored repository-root
> `.env` holds the raw MusicAPI.ai token. Code builds the
> `Authorization: Bearer ...` header. Never store the `Bearer` prefix in the
> value, and never copy the token into this document, `.env.example`, source,
> browser code, a `VITE_` variable, logs, screenshots, prompts or retained
> evidence.

Status: Reference. Not a dependency, credential, budget or runtime
integration of Tactics Guru v2.

Scope: MusicAPI.ai Sonic generation (`POST /api/v1/sonic/create`,
`GET /api/v1/sonic/task/{task_id}`) as a pre-build source for instrumental
music candidates: authentication, the asynchronous task contract, prompting,
scratch handling, validation, provenance, failure, cost and rights. Excludes
runtime vendor use, lyrics, vocals, personas, covers of third-party audio and
acceptance of any file into the game. Field-level prompting detail is in
[musicapi-ai-prompting.md](musicapi-ai-prompting.md).

Project fit: the tech design allows at most one optional music track, loaded
last and failing soft to silence ([§7.3, §7.4](../tech_design.phaser4.draft.md)).
The legacy combat track exists only as Ogg Vorbis with no recorded licence,
and compressed audio must ship as MP3 ([restart plan §5.1](../phaser4-restart-plan.md)),
so a generated instrumental is one candidate route for that single track. No
tracker issue asks for music yet; issue #19 does not use this service.

Last verified: create endpoint, model enum, credit costs and task endpoint
re-checked on 2026-10-07. The observed-behaviour section records a
2026-07-15 run against `sonic-v5-5` made in another project.

Sources: [introduction](https://docs.musicapi.ai/introduction),
[Sonic instructions](https://docs.musicapi.ai/sonic-instructions),
[Sonic create endpoint](https://docs.musicapi.ai/concat-music),
[Sonic task endpoint](https://docs.musicapi.ai/get-sonic-music),
[FAQ](https://docs.musicapi.ai/faq),
[credit guide](https://docs.musicapi.ai/credits-usage-guide),
[WAV endpoint](https://docs.musicapi.ai/wav),
[basic-stem endpoint](https://docs.musicapi.ai/stems-basic),
[terms](https://musicapi.ai/terms).

Rules shared by every generator in this folder are in [README.md](README.md).

## Project boundary

MusicAPI.ai is used only before build, from a hand-run local script. The
shipped game contains:

- no MusicAPI.ai SDK, API key, account ID, task ID, endpoint, provider URL,
  webhook, analytics or online fallback;
- no request to MusicAPI.ai, an upstream model provider or a generated-media
  CDN;
- only a locally committed MP3 that passed the provenance gate below; and
- a mute control, with music optional at run time (tech design §7.4).

This workflow is instrumental-only and creates new material only. It does
not permit:

- lyrics, intelligible words, narration, chanting, choir or vocal personas;
- `add_vocals`, `persona_music`, lyric generation, cover, remaster or
  voice-related endpoints;
- uploading the legacy Ogg track, any other legacy audio or any third-party
  recording as a source for `extend`, `cover`, `remaster` or `add_*` tasks.
  The legacy audio has no recorded licence, so there is no right to transform
  it; or
- naming artists, bands, franchises, copyrighted songs or provider catalogue
  tracks in a prompt.

## Current repository state

As of 2026-10-07:

- `.env.example` declares `GEN_MUSIC_ENDPOINT`, `GET_MUSIC_ENDPOINT`,
  `MUSIC_API_KEY` (empty) and `MUSIC_MODEL_VERSION=sonic-v6`. Nothing in
  `src/`, the build or the tests reads them.
- No MusicAPI.ai dependency is installed and no generation script exists in
  the repository.
- `tmp/` is ignored and is the scratch location for candidates.
- ffmpeg 8.1.1 and ffprobe are installed on the development host for
  validation, loop editing and MP3 export. They are not build dependencies.

Ordinary documentation work makes no live request. No live request has been
made from this repository.

## Credential and endpoint configuration

The committed placeholders are:

```bash
GEN_MUSIC_ENDPOINT=https://api.musicapi.ai/api/v1/sonic/create
GET_MUSIC_ENDPOINT=https://api.musicapi.ai/api/v1/sonic/task/
MUSIC_API_KEY=
MUSIC_MODEL_VERSION=sonic-v6
```

Put a real value only in `.env`. `MUSIC_API_KEY` is the token alone, without a
`Bearer` prefix. Use a project-specific key, a bounded credit balance, the
least account access available, and provider-side IP restrictions when the
account supports them. Rotate or revoke the key after suspected disclosure.

Local Node.js tools should load the ignored file without printing it:

```bash
node --env-file=.env tmp/generate-musicapi-candidate.mjs
```

Never source `.env` into an interactive shell merely to run a request, enable
shell tracing near credentials, interpolate the token into a command argument,
or expose it through a `VITE_` variable. A leaked key must be rotated;
removing the visible copy is not containment.

## Provider surface and cost

The smallest surface that creates and retrieves an instrumental candidate.
All requests use HTTPS and Bearer authentication.

| Method | Endpoint | Credits (2026-10-07) | Project use |
| -- | -- | -- | -- |
| `GET` | `/api/v1/get-credits` | 0 | Optional preflight balance check; record only the before/after delta, never the full response |
| `POST` | `/api/v1/sonic/create` | 20 per `create_music` call, two clips | Submit one instrumental task |
| `GET` | `/api/v1/sonic/task/{task_id}` | 0 | Poll until every returned clip is terminal |
| `POST` | `/api/v1/sonic/wav` | 2 | Optional lossless source for one selected clip |
| `POST` | `/api/v1/sonic/stems/basic` | 30, four stems | Optional experiment for one selected clip |
| `POST` | `/api/v1/sonic/stems/full` | 75, 24 stems | Exceptional; only with an explicit budget decision |

Other create-endpoint operations cost 15 (`extend_music`, `remaster`,
`add_vocals`, `add_instrumental`) or 2 (`concat_music`); none of them is in
scope. The task endpoint recommends polling every 15 to 25 seconds. The
2026-07-15 reading of the docs also listed one create request per three
seconds as the standard limit; that page was not re-read. Pricing, output
count, model availability and limits are provider-controlled: recheck them
immediately before any live run.

Run one task at a time. One track needs one create task and two candidate
clips; a second task is a second budget decision, not a retry.

### Model versions

On 2026-10-07 the create endpoint's `mv` enum is `sonic-v6`,
`sonic-v6-wild` and `sonic-v6-mini`. The endpoint states that Suno retired
v3.5 through v5.5 on 2026-09-09 and maps every retired id (`sonic-v3-5`,
`sonic-v4`, `sonic-v4-5`, `sonic-v4-5-plus`, `sonic-v5`, `sonic-v5-5`) onto
v6. The repository default `MUSIC_MODEL_VERSION=sonic-v6` matches the live
enum. Record both the requested and the returned `mv` for every task.

## Sonic create request

The project uses `create_music` in description mode with the instrumental
flag set.

| Field | Required here | Project value or rule |
| -- | -- | -- |
| `task_type` | Yes | `create_music` |
| `custom_mode` | Yes | `false`: a description, not lyrics |
| `mv` | Yes | `MUSIC_MODEL_VERSION` from `.env`; record requested and returned values |
| `use_suno_cdn` | Yes | The schema marks it required; send `false` explicitly and validate the returned host either way |
| `make_instrumental` | Yes | `true`. Lexical text in the returned `lyrics` rejects the clip; a bracket-only marker still needs a listening check |
| `gpt_description_prompt` | Yes | Original brief plus the common constraint, at most 400 characters |
| `title` | Yes | Working name plus a candidate suffix, at most 80 characters; the provider may rewrite it |
| `duration` | Optional | Integer seconds, 10 through 360; the track lands close to it, not on it. Useful to aim near a loop length |
| `tags` | Optional | Instrumentation, texture, pacing and mix vocabulary, at most 1,000 characters |
| `negative_tags` | Optional | Vocals, words, choir, abrupt ending, clipping and unwanted traits |
| `style_weight` | Optional | 0 through 1; record when used |
| `weirdness_constraint` | Optional | 0 through 1; record when used |

Do not send `prompt`, `lyrics`, `auto_lyrics`, `vocal_gender`, `persona_id`,
`continue_clip_id`, upload URLs or webhook fields.

### Prompt construction

State, in this order:

1. what the track is for (one combat loop for a small forest skirmish);
2. emotional contour and energy range (even, loop-friendly, no climax);
3. instrument and material palette, in original words;
4. pulse and density;
5. mix space reserved for the short combat cues; and
6. exclusions and originality constraints.

Append a common constraint such as:

> No vocals, words, speech, chanting, choir, sung syllables, vocal chops,
> recognizable melody, quotation, pastiche, artist imitation, franchise
> reference, abrupt ending, clipping or dense mastering. Leave transient and
> high-mid space for short combat sound effects.

Negative wording does not guarantee a vocal-free or original result. Every
returned clip gets a full listen and the originality check below.

### Example request body

A project-shaped reference body. Running it spends 20 credits.

```json
{
  "task_type": "create_music",
  "custom_mode": false,
  "mv": "sonic-v6",
  "use_suno_cdn": false,
  "make_instrumental": true,
  "title": "Forest Ruins combat candidate 01",
  "duration": 120,
  "gpt_description_prompt": "Instrumental combat-music source for a small forest-ruins skirmish: steady mid-tempo pulse, hand percussion, low strings, a sparse woodwind motif and restrained brass swells; even energy with no climax or drop so it can loop; leave transient and high-mid space for short combat sound effects; clean ending. No vocals, words, choir, recognizable melody, artist imitation or clipping.",
  "tags": "instrumental game score, forest, hand percussion, low strings, woodwind, restrained brass, mid-tempo, spacious",
  "negative_tags": "vocals, lyrics, spoken words, choir, vocal chops, abrupt ending, clipping, dense mastering"
}
```

The description above is 383 characters. Validate the length locally before
every submission.

## Safe single-task request pattern

The repository requires Node 22.12 or newer, which has `fetch` built in; no
provider SDK is required. A local tool validates configuration before spending
credits and never prints the key or the full provider response.

```javascript
const createEndpoint = process.env.GEN_MUSIC_ENDPOINT;
const apiKey = process.env.MUSIC_API_KEY;
const model = process.env.MUSIC_MODEL_VERSION;
const description = "Use the validated project brief here";

if (!createEndpoint || !apiKey || !model) {
  throw new Error("MusicAPI.ai generation is not configured");
}
if (apiKey.startsWith("Bearer ")) {
  throw new Error("MUSIC_API_KEY must contain the raw token only");
}
const createUrl = new URL(createEndpoint);
if (createUrl.origin !== "https://api.musicapi.ai") {
  throw new Error("Unexpected MusicAPI.ai create origin");
}
if (Array.from(description).length > 400) {
  throw new Error("MusicAPI.ai description exceeds 400 characters");
}

const response = await fetch(createUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    task_type: "create_music",
    custom_mode: false,
    mv: model,
    use_suno_cdn: false,
    make_instrumental: true,
    title: "Forest Ruins combat candidate 01",
    duration: 120,
    gpt_description_prompt: description,
    tags: "instrumental game score, forest, hand percussion, low strings, spacious",
    negative_tags: "vocals, words, choir, vocal chops, clipping",
  }),
  signal: AbortSignal.timeout(30_000),
});

const raw = await response.text();
if (!response.ok || raw.length > 65_536) {
  throw new Error(`MusicAPI.ai submit failed with status ${response.status}`);
}

const result = JSON.parse(raw);
if (
  !result ||
  typeof result !== "object" ||
  Array.isArray(result) ||
  typeof result.task_id !== "string" ||
  result.task_id.length > 128
) {
  throw new Error("MusicAPI.ai returned no bounded task ID");
}

console.log(JSON.stringify({ accepted: true, taskId: result.task_id }));
```

The success schema lists `code`, `message` and `task_id`; a 2026-07-15 run
received only `message` and `task_id`. Validate the task ID and do not
require `code`.

Write the accepted task ID to scratch provenance immediately. Once a task ID
exists, do not submit the same brief again because polling or a download
timed out.

## Polling contract

Poll `GET_MUSIC_ENDPOINT + encodeURIComponent(taskId)` every 15 to 25
seconds with an overall deadline and cancellation.

| State | Treatment |
| -- | -- |
| `pending` | Wait; do not resubmit or download a placeholder URL |
| `running` | Wait |
| `succeeded` | Validate each returned clip and require a final HTTPS `audio_url` before downloading |
| `failed` | Record a sanitised failure and stop; do not promote bytes |
| Other | Treat as a provider schema change; stop without guessing |

The response may be an initial `not_ready` object before the `data` array
appears. Parse from `unknown`, bound the body before JSON parsing, and
validate every field used. Do not log the whole body, generated `lyrics`,
URLs, headers or exception objects that may contain request details.

A create task is complete only when every returned clip is terminal. Keep
each `clip_id` distinct. A streaming or placeholder URL is not a final asset.

### Observed provider behaviour (2026-07-15, `sonic-v5-5`, another project)

These observations came from a paid run in a different project and predate
the v6 enum. They describe the provider, not this repository, and need a
fresh check against `sonic-v6`.

| Stage or field | Observed value and handling |
| -- | -- |
| Submit response | HTTP 200 with `message` and `task_id`; no `code` |
| First poll | `type: not_ready` object, no `data` array |
| Later polls | HTTP 200 with numeric `code`, string `message`, two-element `data` |
| Clip states | Both clips moved `running` then `succeeded`; select only after both are terminal |
| `duration` | Decimal string, not a number; parse to a finite positive number |
| `lyrics` | A short bracket-only instrumental marker, not an empty string; reject lexical text and still listen |
| `mv` | Echoed the requested model |
| `video_url` | `null` |
| Final `audio_url` | HTTPS `cdn1.suno.ai` MP3 regardless of `use_suno_cdn`; validate the host and the bytes |
| Provider title | Rewritten without the candidate suffix; store submitted and returned titles separately |
| Failures | Some create and full-stem tasks failed upstream with a reported refund. One paired balance check saw exactly the task cost returned. Treat terminal failure as a normal bounded outcome and verify refunds by balance delta, not by message |

The selected files from that run were `audio/mp3`, 48 kHz stereo, between
about 68 and 193 seconds, with an ID3 comment naming the upstream generator
and clip ID. Preserve and hash original metadata; stripping it creates a
derived file with a new hash.

### Retry and duplicate-spend rules

- Before a request is sent, a configuration or validation failure is safe to
  fix and retry.
- A clear HTTP rejection with no task ID may be retried after correcting the
  cause and confirming the budget.
- A connection loss after transmission is ambiguous. Do not resubmit blindly;
  no idempotency key is documented. Check the balance delta first.
- After a task ID is accepted, retry only polling and downloads. A terminal
  provider failure may justify one replacement task only after the refund is
  confirmed by balance delta and the budget allows it.
- On cancellation, keep the task ID and current state in scratch so polling
  can resume without a duplicate task.

## Download and scratch handling

Generated URLs are untrusted, temporary inputs. They never become asset keys.

1. Require HTTPS and an allowlisted provider or generated-media CDN host.
2. Use `GET` with redirects bounded to HTTPS; do not rely on `HEAD`.
3. Write to a unique `.part` file under
   `tmp/audio-generation/musicapi-ai/{task-id}/`.
4. Bound download time and bytes before buffering or decoding.
5. Validate MIME, signature, codec, channels, sample rate, duration and a
   full decode with `ffprobe` and `ffmpeg`.
6. Compute SHA-256 and record the exact byte count before any edit.
7. Rename atomically to the candidate filename only after validation.
8. Delete incomplete `.part` files on failure while keeping the task record.

Suggested layout:

```text
tmp/audio-generation/musicapi-ai/
  provenance.json
  {task-id}/
    forest-ruins-combat-{clip-id}-provider.mp3
```

Do not overwrite an earlier candidate. Trimming, looping, mixing and
re-encoding create derived files with their own hashes and records.

## Validation and listening review

Every downloaded candidate must pass:

- a full decode with no malformed frames or truncation;
- a finite, plausible duration and file size;
- a non-silent waveform without clipping or severe encoding artefacts;
- a full listen: no words, speech, singing, chanting, choir, vocal chops or
  lyric-like fragments anywhere in the track;
- no recognisable melody, imitation or copied structure, judged by at least
  one listener who did not write the brief;
- enough headroom and spectral room for the twelve short combat cues; and
- a musical contour that tolerates looping.

Do not normalise or master a provider file before recording its original
hash. Loudness and peak targets are a later mix decision; record measured
values (for example `ffmpeg -af ebur128`) rather than inventing a target
here.

## From candidate to the one committed track

1. Keep the original provider MP3 and its record in scratch.
2. Choose a loop region and edit with ffmpeg: trim, crossfade the seam if
   needed, fade the ends. Record every command and the ffmpeg version.
3. Export one MP3 (restart plan §5.1 item 6: the only compressed format every
   target browser decodes). Do not also ship Ogg or WAV for the same key.
4. Write the provenance record before the commit: a QA note in the shape of
   [`docs/qa/issue-16-assets.md`](../qa/issue-16-assets.md) with the
   provider, model requested and returned, task and clip IDs, exact prompt
   and parameters, date, bytes and SHA-256 of the provider file and of the
   export, measured loudness, the ffmpeg commands and the listening-review
   result. When the asset manifest exists, add one row: key, source, origin,
   licence, duration, channels, loop points.
5. Get the owner's sign-off (restart plan D3). The repository is public and
   has no LICENSE file; the licence terms for assets are undecided.
6. Load the track last, after SFX, and fail soft to no music (tech design
   §7.3). Nothing about the track may be on the critical path, and the
   deployed size budget (D2) is measured with it included.

Stem separation and multi-layer adaptive packages are out of scope for a
single optional track. If a candidate cannot loop acceptably, generate
another or ship no music.

## Provenance record

The record must not contain credentials, full response payloads,
secret-bearing URLs or account data.

| Field | Purpose |
| -- | -- |
| Asset key | Game-facing identity, independent of provider titles, clip IDs and URLs |
| Provider and endpoint | MusicAPI.ai Sonic `create_music` |
| Requested and returned `mv` | Detect aliasing or model drift |
| Timestamp | Bind the output to the plan, pricing and terms in force at generation |
| Exact prompt and parameters | The authorised brief and settings |
| Task ID and clip ID | Bounded traceability without storing raw responses |
| Plan class and cost | The entitlement in force and the credits spent, without account data |
| Terms evidence | Official URL, date read and a retained copy's location |
| Original file facts | SHA-256, bytes, codec, sample rate, channels, duration, measured loudness |
| Listening review | Who listened, date, result and any rejection reason |
| Edits | ffmpeg commands and version for every derived file |
| Export facts | SHA-256, bytes and codec of the committed MP3 |
| Sign-off | D3 approval reference |

## Rights and provider risk

MusicAPI.ai's terms (read 2026-07-15) state that the user retains ownership
and commercial-use rights for generated songs, and assign the user
responsibility for originality, non-infringement and third-party claims.
Treat that as provider policy, not as a guarantee that a given output is
copyrightable, exclusive, non-infringing or safe to ship.

Before a run and again before the commit:

- record the account plan class and confirm its terms permit commercial game
  use;
- keep a dated copy of the terms page;
- use only original prompts; never upload or reference legacy or third-party
  audio;
- complete the listening review; and
- apply restart plan D3.

Provider claims, generated metadata or payment for credits do not replace
the repository's provenance and sign-off.

## Checklist

Before a live request:

- [ ] Brief, model, title, `duration`, task count and maximum credit spend are
  written down.
- [ ] The create, task, credit, model and terms pages have been rechecked.
- [ ] `gpt_description_prompt` is at most 400 characters; `title` at most
  80; `tags` at most 1,000.
- [ ] `.env` is ignored, the raw token is present, and no secret appears in
  the request body, command arguments, source, logs or evidence.
- [ ] The prompt names no artist, franchise, song, legacy file or vocal.
- [ ] Unique scratch directory, `.part` handling, cancellation and resume are
  ready.

Before keeping a candidate:

- [ ] The task succeeded and the clip has a final downloadable URL.
- [ ] Returned `lyrics` is empty or bracket-only, and a full listen found no
  voice.
- [ ] Download, decode, metadata, waveform, SHA-256 and byte count are
  recorded.
- [ ] The listening and originality review is recorded as passed.

Before the commit:

- [ ] One MP3, recorded ffmpeg commands, QA note or manifest row, measured
  loudness and size.
- [ ] Loop seam, mute, pause, visibility suspension and restart checked in
  the browser.
- [ ] Owner sign-off under D3.
