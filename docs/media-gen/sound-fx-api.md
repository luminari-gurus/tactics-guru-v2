# ElevenLabs sound-effects API

> **Credential boundary:** `.env.example` declares `ELEVENLABS_API_KEY` with
> an empty value. Put a real key only in the ignored repository-root `.env`,
> and only for a hand-run, budget-bounded generation pass. Never put it in this
> document, `.env.example`, source, browser code, a `VITE_` variable, tests,
> logs, screenshots, prompts or retained evidence.

Status: Reference. Not a dependency, credential, budget or runtime
integration of Tactics Guru v2.

Scope: ElevenLabs `POST /v1/sound-generation` as a pre-build source for
sound-effect candidates: authentication, request and response contract,
prompting, scratch handling, provenance, failure handling and rights. Excludes
runtime vendor use, music, speech, and acceptance of any file into the game.

Project fit: the first slice needs the twelve battle cues in the tech design's
cue table ([§7.4](../tech_design.phaser4.draft.md)) plus a mute control. It
needs no ambience, footstep library, interface soundscape or voice. The legacy
WAV cues have no recorded origin for four of the twelve and no licence for any
([restart plan §5.1](../phaser4-restart-plan.md)), so generation is one way to
fill that table; a CC0 library and a provenance review of the legacy files are
the others. Issue #19 does not use this endpoint: its unlock tone is generated
with ffmpeg ([plan D-A](../ongoing-projects/issue-19-audio-lifecycle-plan.md)).

Last verified: endpoint contract re-checked against the API reference on
2026-10-07. Rights, pricing and overview pages were last read 2026-07-15.

Sources: [create sound effect](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert),
[sound-effects overview](https://elevenlabs.io/docs/overview/capabilities/sound-effects),
[authentication](https://elevenlabs.io/docs/api-reference/authentication),
[errors](https://elevenlabs.io/docs/eleven-api/resources/errors),
[commercial-use guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform),
[Sound Effects Terms](https://elevenlabs.io/sound-effects-terms).

Rules shared by every generator in this folder are in [README.md](README.md).

## Project boundary

ElevenLabs is used only before build, from a hand-run local script. The
shipped game contains:

- no ElevenLabs SDK, API key, account identifier, endpoint, remote audio URL,
  telemetry or vendor fallback;
- no request to ElevenLabs or any other non-product origin;
- only locally committed files that passed the provenance gate below; and
- a mute control, with every outcome readable without sound. A sound failure
  never stalls a turn (tech design §5.7, §7.4).

This endpoint is for sound-effect candidates only. Music belongs to
[musicapi-ai.md](musicapi-ai.md). Speech is not planned for the first slice
([text-to-speech.md](text-to-speech.md)).

## Current repository state

As of 2026-10-07:

- `.env.example` declares `ELEVENLABS_API_KEY=`. Nothing in `src/`, the build
  or the tests reads it; `npm ci`, `npm run build` and `npm test` run without
  it.
- No ElevenLabs package is in `package.json`, and no generation script exists
  in the repository.
- `tmp/` is ignored and is the scratch location for candidates.
- `public/proof/` holds the diagnostic's assets. Shipped game assets will go
  through a manifest module under `src/assets/` and be emitted content-hashed
  into `dist/assets/` (restart plan §5.1, tech design §7.2).
- ffmpeg 8.1.1 is installed on the development host for trimming and export.
  Converters are run by hand and are not build dependencies.

The examples below are provider references. No live request has been made
from this repository.

## Credential setup

Copy `.env.example` to `.env` and fill in the value there. A shell example
assumes the calling process already has `ELEVENLABS_API_KEY` in its
environment; `node --env-file=.env script.mjs` loads it without printing it.

Use a dedicated key with:

- only the Sound Effects permission;
- a credit quota sized to the batch;
- IP allowlisting when the account and the machine support it; and
- rotation or revocation after any suspected disclosure.

Never print the environment, enable shell tracing around a request, paste the
key into a command argument, or send it to browser code. Vite exposes only
`VITE_`-prefixed variables to the bundle, so never give a key that prefix. A
key found in source or retained output must be rotated; deleting the line is
not containment.

## Endpoint contract

Re-checked 2026-10-07.

| Item | Value |
| -- | -- |
| Method | `POST` |
| URL | `https://api.elevenlabs.io/v1/sound-generation` |
| Authentication | `xi-api-key: ${ELEVENLABS_API_KEY}` |
| Request | `application/json` |
| Success | `200`, binary audio in the requested `output_format` |
| Validation failure | `422` with a `detail` array naming the field |

The endpoint schema renders `xi-api-key` as optional; the authentication
guide requires it. Treat it as required.

### Query parameter

| Name | Required | Treatment |
| -- | -- | -- |
| `output_format` | No | `codec_sample_rate_bitrate`, for example `mp3_44100_128`. The reference lists MP3, PCM, Opus, μ-law and A-law families; some rates depend on the plan. Record the exact value used. |

### JSON body

| Field | Required | Default | Rules and treatment |
| -- | -- | -- | -- |
| `text` | Yes | None | The cue brief. No artist names, franchise names, legacy filenames or copied text. |
| `loop` | No | `false` | Seamless loop, v2 model only. Keep `false` for the one-shot cue table. |
| `duration_seconds` | No | `null` (model decides) | 0.5 through 30. Four of the slice's cues are 0.09 to 0.12 s long in the legacy build; request 0.5 s and trim in ffmpeg. |
| `prompt_influence` | No | `0.3` | 0 through 1. Higher follows the text more literally with less variation. |
| `model_id` | No | `eleven_text_to_sound_v2` | The only value the reference lists. Set it explicitly so the record does not depend on a default. |

### Success response

The body is audio bytes, not JSON. Record `content-type`, the byte length,
and the `request-id`, `x-trace-id` and `character-cost` headers when present.
Hash the bytes with SHA-256 before any edit. Do not retain the key, the raw
account response or a full provider error payload as evidence.

## Minimal candidate request

Run a live request only with a named cue, a prompt reviewed against the rules
below and a known credit budget. This writes one disposable candidate under
ignored `tmp/`; it does not create a game asset.

```bash
mkdir -p tmp/audio-generation/elevenlabs

printf 'xi-api-key: %s\n' "$ELEVENLABS_API_KEY" | curl --silent --show-error --fail \
  --connect-timeout 10 \
  --max-time 120 \
  --max-filesize 26214400 \
  --request POST \
  --url "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128" \
  --header @- \
  --header "Content-Type: application/json" \
  --data '{
    "text": "Short blunt sword impact on leather and wood, firm attack, brief tail, close and dry, no metal ring, no voice, no words, no music",
    "duration_seconds": 0.6,
    "prompt_influence": 0.4,
    "loop": false,
    "model_id": "eleven_text_to_sound_v2"
  }' \
  --output tmp/audio-generation/elevenlabs/attack-hit-001.mp3
```

Use a unique filename for every request. Never overwrite a candidate, and do
not assume the same prompt reproduces the same bytes. The header is supplied
on standard input so the expanded key is not a `curl` process argument.

## Node.js request pattern

The repository requires Node 22.12 or newer, which has `fetch` built in; no
provider SDK is needed. This pattern returns bounded bytes plus safe response
metadata and writes nothing into `public/` or `src/`.

```javascript
const endpoint = new URL("https://api.elevenlabs.io/v1/sound-generation");
endpoint.searchParams.set("output_format", "mp3_44100_128");

const apiKey = process.env.ELEVENLABS_API_KEY;
const maximumAudioBytes = 25 * 1024 * 1024;

if (!apiKey) {
  throw new Error("ElevenLabs sound-effect generation is not configured");
}

const response = await fetch(endpoint, {
  method: "POST",
  signal: AbortSignal.timeout(120_000),
  headers: {
    "Content-Type": "application/json",
    "xi-api-key": apiKey,
  },
  body: JSON.stringify({
    text: "Quick air whoosh of a blade passing with no contact, light and short, dry, no voice, no words, no music",
    duration_seconds: 0.5,
    prompt_influence: 0.4,
    loop: false,
    model_id: "eleven_text_to_sound_v2",
  }),
});

const requestId = response.headers.get("request-id") ?? "unavailable";

if (!response.ok) {
  throw new Error(`ElevenLabs generation failed: status=${response.status} requestId=${requestId}`);
}

const declaredLength = Number(response.headers.get("content-length"));

if (Number.isFinite(declaredLength) && declaredLength > maximumAudioBytes) {
  throw new Error("ElevenLabs audio exceeded the candidate byte limit");
}

if (!response.body) {
  throw new Error("ElevenLabs returned no candidate body");
}

const reader = response.body.getReader();
const chunks = [];
let receivedBytes = 0;

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maximumAudioBytes) {
      await reader.cancel("candidate byte limit exceeded");
      throw new Error("ElevenLabs audio exceeded the candidate byte limit");
    }
    chunks.push(value);
  }
} finally {
  reader.releaseLock();
}

const bytes = new Uint8Array(receivedBytes);
let offset = 0;
for (const chunk of chunks) {
  bytes.set(chunk, offset);
  offset += chunk.byteLength;
}

if (bytes.byteLength === 0) {
  throw new Error("ElevenLabs returned an empty candidate");
}

const candidate = {
  bytes,
  requestId,
  traceId: response.headers.get("x-trace-id"),
  characterCost: response.headers.get("character-cost"),
  contentType: response.headers.get("content-type"),
};
```

A script kept in the repository must also validate the content type, write
to a unique `.part` path, delete partial output on failure, hash the bytes,
and record provenance. It must never copy a file into `public/` or
`src/assets/` by itself.

## Cue briefs for this project

Start from one row of the tech design's cue table and write a brief with
these fields:

| Field | Prompt content |
| -- | -- |
| Role | The cue key (`move`, `attack_hit`, `miss`, …) and whether it carries meaning or is decoration |
| Source and material | What physically or synthetically makes the sound |
| Action | Impact, movement, release, rise, decay or another concrete event |
| Timing | One-shot, target length, attack speed, tail |
| Perspective | Close, distant, dry, reflected |
| Intensity and frequency | How hard, and which range should stay clear of the music and of other cues |
| Exclusions | No voice, words, singing, music, melody, clipping, long tail |

Describe an audio asset, not game lore. Keep one material and mix vocabulary
across a cue family and change only the event or intensity between
candidates.

Examples for the slice's cues:

- `move`: `Single soft footstep scuff on dry leaves and packed earth, one step, close and dry, under half a second, no voice, no music`.
- `attack` (release): `Short leather-and-steel sword draw and swing, quick rising air, no contact, dry, no voice, no music`.
- `attack_hit`: `Short blunt sword impact on leather and wood, firm attack, brief tail, close and dry, no metal ring, no voice, no words, no music`.
- `miss`: `Quick air whoosh of a blade passing with no contact, light and short, dry, no voice, no words, no music`.
- `ember_burst_impact`: `Compact fire burst with a low thump and crackling embers, about one second, restrained tail, no voice, no words, no music`.
- `victory`: `Short bright flourish of two brass notes and a drum hit, about two seconds, clean ending, no voice, no words`.

The last example asks a sound-effects model for something musical. Judge the
result by ear; a stinger may be better served by the music route.

Do not prompt with an artist, franchise, branded sonic logo, recognizable
song, third-party character or a request to imitate protected audio. Do not
describe or name the legacy WAV files: they have no recorded licence, and the
endpoint takes no audio input in any case.

### Parameter starting points

- `loop: false` for every cue in the table.
- Set `duration_seconds` explicitly for timing-critical combat cues; let the
  model decide for `victory` and `defeat`.
- `prompt_influence` 0.3 to 0.45 for the first pass; raise it only when the
  output misses a required material, action, duration or exclusion.
- Generate several candidates per cue and choose by ear. The first response
  is not the asset.

Record the actual values with each candidate.

## From candidate to committed cue

1. Generate into `tmp/audio-generation/elevenlabs/` with unique filenames.
2. For each candidate record the prompt, parameters, `output_format`, model,
   date, byte length, SHA-256 and the safe response headers.
3. Listen and compare. Reject speech, singing, music where none was asked
   for, clipping, weak attacks, long tails and candidates that mask each
   other in the mix.
4. Edit with ffmpeg: trim to the cue's length, add 5 to 10 ms fades, peak
   normalise, downmix to mono. Record the exact commands and the ffmpeg
   version; the restart plan requires conversion commands to be recorded
   next to the manifest.
5. Export one file per cue. Compressed audio must be MP3 (restart plan §5.1
   item 6). Whether the very short cues ship as mono WAV instead is open
   question T11 in the tech design (§12). Phaser picks a file by extension
   and the browser's `canPlayType`, so ship one format per key.
6. Write the provenance record before the commit: a QA note in the shape of
   [`docs/qa/issue-16-assets.md`](../qa/issue-16-assets.md) with the tool,
   model, exact prompt, parameters, bytes and SHA-256 of both the provider
   bytes and the export, plus the ffmpeg commands. When the asset manifest
   exists, add one row per file: key, source, origin, licence, duration,
   channels.
7. Get the owner's sign-off (restart plan D3) before the first commit. The
   repository is public and has no LICENSE file; the licence terms for assets
   are undecided.
8. Load cues after the Begin tap, never on the critical path; a missing cue
   plays nothing (tech design §7.3).

## Failure and retry

| Condition | Treatment |
| -- | -- |
| `400` or `422` | Correct the request; do not retry unchanged. |
| `401` missing or invalid key | Stop. Check `.env` and the key's scope. |
| `402` insufficient credits | Stop. Do not raise the budget inside the script. |
| `403` permission or IP allowlist | Stop. Keep the restriction and fix the key or the machine. |
| `429` rate or concurrency limit | Bounded exponential backoff with jitter; do not add parallelism. |
| Timeout, `500`, `503` | Retry a bounded number of times with backoff. |
| Cancellation | Delete partial scratch output; never promote it. |
| Empty, oversized, corrupt or undecodable audio | Delete the candidate and keep a one-line failure record. |

Keep status, provider error code, request ID, candidate name and attempt
count in the log. Do not log the full prompt or the provider message
routinely. A provider failure never changes the game, the build or a
committed asset.

## Rights and production eligibility

These controls summarise provider pages as read on 2026-07-15. They are not
legal advice and do not guarantee copyright protection or non-infringement.

- ElevenLabs states that free-plan output has no commercial licence.
- It states that paid-plan output may be used commercially when it was not
  made with a Beta service and the user holds the necessary rights and
  follows the applicable terms and law.
- The Sound Effects Terms allow the account to opt out of future third-party
  sublicensing of its outputs; the opt-out does not unwind uses already
  granted.

Before a batch whose output may ship:

- confirm a paid entitlement and that Sound Effects is not a beta feature for
  the account, and keep the evidence with the batch record;
- enable the third-party sublicensing opt-out;
- use only original prompts; and
- treat the result as subject to restart plan D3: origin and licence recorded
  per file, owner sign-off, and a licence decision for the public repository.

Candidates generated under a free plan stay research-only and are not
promoted later because the plan changed.

## Batch checklist

- [ ] Each cue maps to a row of the tech design's cue table or to a decision
  that adds one.
- [ ] Prompts contain no artist, franchise, legacy filename, speech, singing,
  music or melody unless the cue is a stinger.
- [ ] The key is scoped and quota-bound, loaded from `.env`, and absent from
  command output and retained files.
- [ ] Plan, beta status, terms, opt-out and budget have been rechecked.
- [ ] Unique candidate names, byte limit, timeout and partial-file cleanup
  are in place.
- [ ] Every kept candidate has prompt, parameters, headers, bytes and
  SHA-256 recorded before editing.
- [ ] Exports have recorded ffmpeg commands, one format per key, and a QA
  note or manifest row.
- [ ] The built game makes no vendor request and plays with audio muted or
  unavailable.

## Reverification

Recheck before a batch whose output may ship, and whenever the endpoint,
model, output formats, plan, pricing or terms change:

- [Create sound effect API reference](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)
- [Sound-effects overview and prompting guide](https://elevenlabs.io/docs/overview/capabilities/sound-effects)
- [API authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [API keys and restrictions](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys)
- [API errors](https://elevenlabs.io/docs/eleven-api/resources/errors)
- [API pricing](https://elevenlabs.io/pricing/api)
- [Commercial-use guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)
- [Sound Effects Terms](https://elevenlabs.io/sound-effects-terms)

This repository has no markdown linter; run `git diff --check` before
committing documentation changes.
