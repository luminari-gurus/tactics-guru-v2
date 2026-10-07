# ElevenLabs text-to-speech API

> **Credential boundary:** the ElevenLabs API key is `ELEVENLABS_API_KEY` in
> the ignored repository-root `.env`. `.env.example` carries the name with an
> empty value. Never commit `.env`, and never copy the value into this
> document, source, browser code, a `VITE_` variable, tests or logs.

Status: Reference. Not a dependency, credential, budget or runtime
integration of Tactics Guru v2.

Scope: ElevenLabs `POST /v1/text-to-speech/{voice_id}` authentication, request
fields, binary response, examples, and failure handling, plus the minimum needed
of voice listing, instant voice cloning, and `POST /v1/text-to-dialogue`;
excludes streaming and WebSocket endpoints, timestamps, speech-to-text, billing,
and voice-library administration

Project fit: no speech is planned. The first slice ships a small set of battle
sound effects, a mute control and at most one optional music track
([tech design §1, §7.4](../tech_design.phaser4.draft.md)); there is no
narration, no battle bark and no voiced dialogue, and issue #19 uses none of
this. The document is kept because the key already exists for sound effects
([sound-fx-api.md](sound-fx-api.md)) and a later decision may want voice
lines. Any such decision needs a tracker issue, a rights review for every
voice and the provenance gate in [README.md](README.md) before a file is
committed.

Last verified: 2026-10-07

Evidence: [Create speech endpoint reference](https://elevenlabs.io/docs/api-reference/text-to-speech/convert),
[models overview](https://elevenlabs.io/docs/overview/models),
[text-to-dialogue endpoint reference](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert),
[API authentication](https://elevenlabs.io/docs/api-reference/authentication),
[API errors](https://elevenlabs.io/docs/eleven-api/resources/errors),
[voice search endpoint](https://elevenlabs.io/docs/api-reference/voices/search),
[instant voice clone endpoint](https://elevenlabs.io/docs/api-reference/voices/ivc/create),
and [prompting controls](https://elevenlabs.io/docs/best-practices/prompting/controls),
checked 2026-10-07

## Project boundary

ElevenLabs is not a production dependency and the shipped game sends nothing
to it. If speech is ever generated, it is generated ahead of time by a
hand-run local script; the browser bundle never contains the key, the SDK, or
a request to `api.elevenlabs.io`. Outputs go to the ignored
`tmp/audio-generation/elevenlabs/` scratch directory, and a file reaches
`src/assets/` only through the provenance record and owner sign-off
described in [README.md](README.md). Shipped speech would have to be MP3
([restart plan §5.1](../phaser4-restart-plan.md)).

Never call ElevenLabs directly from browser code with a long-lived API key. The
official authentication guide is explicit: the key is a secret and must not be
exposed in client-side code. Keep the key in a trusted server, build tool, or
local generation script, and do not commit it to the repository. ElevenLabs
offers single-use tokens for client-side use; they are out of scope here.

## Endpoint summary

The request and defaults below follow the official endpoint reference as
verified on 2026-10-07.

| Item | Value |
| -- | -- |
| Method | `POST` |
| URL | `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` |
| Authentication | `xi-api-key` header |
| Request type | `application/json` |
| Required path parameter | `voice_id` |
| Required body field | `text` |
| Success | `200` with binary audio in the requested `output_format` |

Regional hosts (`api.us.elevenlabs.io`, `api.eu.residency.elevenlabs.io`, and
others) exist for data-residency accounts; use the default host unless the
account is provisioned otherwise.

Create and manage API keys in the ElevenLabs dashboard. Each key supports scope
restriction (limit it to Text to Speech and, if needed, Voices), a credit
quota, and IP allowlisting; use all three for a generation key. A local shell
or trusted server process must load this repository-root `.env` setting:

```bash
ELEVENLABS_API_KEY=
```

The line above mirrors `.env.example`; the real value belongs only in `.env`.
Standalone shell examples require the variable to be exported into the shell
environment first. The examples also use `ELEVENLABS_VOICE_ID` and
`ELEVENLABS_TTS_MODEL_ID`, which are shell variables for the examples, not
`.env.example` entries; promote them to `.env` only if the team standardizes
them. Do not put a real key in `.env.example`, client-side environment
variables, a `VITE_` variable, test fixtures, logs, screenshots, or
documentation.

## Minimal request

Only `text` is required in the JSON body. The voice is chosen by the `voice_id`
path segment, and the output encoding by the `output_format` query parameter.

```bash
export ELEVENLABS_VOICE_ID="voice-id-from-voice-list"

printf 'xi-api-key: %s\n' "$ELEVENLABS_API_KEY" | curl --silent --show-error --fail \
  --connect-timeout 10 \
  --max-time 120 \
  --max-filesize 26214400 \
  --request POST \
  --url "https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128" \
  --header @- \
  --header "Content-Type: application/json" \
  --data '{
    "text": "Welcome, adventurer. Your journey begins now.",
    "model_id": "eleven_multilingual_v2"
  }' \
  --output welcome.mp3
```

The success body is audio, not JSON. Save it as bytes or stream it to its final
destination. The key header is supplied on standard input so the expanded
secret is not a `curl` process argument.

## Headers

| Header | Required | Value |
| -- | -- | -- |
| `xi-api-key` | Yes | The ElevenLabs API key |
| `Content-Type` | Yes | `application/json` |

The endpoint schema renders `xi-api-key` as optional, but the authentication
guide requires it for API requests. Project tooling must treat it as required.

## Query parameters

| Parameter | Type | Default | Rules and purpose |
| -- | -- | -- | -- |
| `output_format` | string | `mp3_44100_128` | Encoding as `codec_sample_rate_bitrate`; see [Output formats](#output-formats). |
| `enable_logging` | boolean | `true` | `false` requests zero-retention mode, which is an enterprise feature. Leave the default unless the account is entitled. |
| `optimize_streaming_latency` | integer | `null` | Deprecated; `0` through `4`. Do not use for new tooling. |

## JSON request fields

Fields not marked required are optional. Defaults come from the endpoint
reference rather than from SDK-specific defaults.

| Field | Type | Required | Default | Rules and purpose |
| -- | -- | -- | -- | -- |
| `text` | string | Yes | - | Text to synthesize. The per-request character limit depends on `model_id`. |
| `model_id` | string | No | `eleven_multilingual_v2` | Model identifier; see [Models](#models). Set it explicitly so provenance does not depend on a moving default. |
| `language_code` | string or null | No | `null` | ISO 639-1 code that forces the output language. Not supported by `eleven_multilingual_v2`. |
| `voice_settings` | object or null | No | `null` | Per-request overrides of the voice's stored settings; see [Voice settings object](#voice-settings-object). |
| `pronunciation_dictionary_locators` | array or null | No | `null` | Up to three `{ "pronunciation_dictionary_id", "version_id" }` objects. `version_id` omitted uses the latest version. |
| `seed` | integer or null | No | `null` | `0` through `4294967295`. Best effort toward repeatable sampling; determinism is not guaranteed. |
| `previous_text` | string or null | No | `null` | Text that precedes this request in a longer passage; improves continuity across splits. |
| `next_text` | string or null | No | `null` | Text that follows this request; improves continuity across splits. |
| `previous_request_ids` | string array or null | No | `null` | Up to three request IDs of preceding generations, as an alternative to `previous_text`. |
| `next_request_ids` | string array or null | No | `null` | Up to three request IDs of following generations; useful when regenerating one segment. |
| `use_pvc_as_ivc` | boolean | No | `false` | Uses the IVC version of a professional voice clone; may improve expressiveness and reduce latency. |
| `apply_text_normalization` | string | No | `auto` | `auto`, `on`, or `off`. Controls spelled-out numbers, dates, and similar. |
| `apply_language_text_normalization` | boolean | No | `false` | Language-specific normalization; currently Japanese only. Adds latency. |

Start with the defaults. Change sampling and voice controls only with repeatable
transcription, pronunciation, prosody, similarity, and acoustic-quality tests
against representative game copy.

### Voice settings object

Every field is nullable; an omitted field keeps the voice's stored value.

| Field | Type | Default | Rules and purpose |
| -- | -- | -- | -- |
| `stability` | number | `0.5` | Consistency between generations. Lower values widen emotional range; higher values can sound monotonous. |
| `similarity_boost` | number | `0.75` | How closely output adheres to the source voice. High values can reproduce artifacts from the reference audio. |
| `style` | number | `0` | Style exaggeration of the original speaker. Any value other than `0` costs extra compute and latency. |
| `use_speaker_boost` | boolean | `true` | Boosts similarity to the original speaker at a small latency cost. |
| `speed` | number | `1` | Speaking-rate multiplier. The prompting guide gives `0.7` through `1.2` as the usable range; extreme values degrade quality. |

Example:

```json
{
  "text": "The gate is opening.",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.6,
    "similarity_boost": 0.75,
    "style": 0,
    "use_speaker_boost": true,
    "speed": 0.95
  }
}
```

### Text controls

- `eleven_v4` and `eleven_v3` do not support SSML `<break>` tags. Use
  punctuation, ellipses, dashes, and audio tags such as `[short pause]`,
  `[whispers]`, or `[sighs]` to shape delivery.
- `eleven_v4` accepts inline IPA transcriptions wrapped in forward slashes.
  Flash and v2 models accept SSML `<phoneme>` tags with CMU Arpabet or IPA;
  Arpabet is the documented recommendation for predictable results.
- Alias entries in a pronunciation dictionary work with every model and are the
  portable option for fixed in-game names.

## Models

The lineup below follows the models overview as verified on 2026-10-07. Query
`GET /v1/models` for the live list before a production run.

| `model_id` | Characters per request | Languages | Latency | Position |
| -- | -- | -- | -- | -- |
| `eleven_v4` | 10,000 | 90+ | Standard | Current flagship for quality and expressiveness |
| `eleven_v4_turbo` | Not stated | 90+ | About 100 ms | Current flagship for real-time use |
| `eleven_v3` | 5,000 | 70+ | Standard | Previous generation; multi-speaker dialogue |
| `eleven_v3_conversational` | Not stated | 70+ | About 280 ms | Previous generation, real-time |
| `eleven_multilingual_v2` | 10,000 | 29 | Standard | Stable choice for long-form narration; endpoint default |
| `eleven_flash_v2_5` | 40,000 | 32 | About 75 ms | Fast, roughly half the cost of standard models |
| `eleven_flash_v2` | 30,000 | English only | About 75 ms | Fast, English only |

`eleven_turbo_v2_5` and `eleven_turbo_v2` are deprecated; the overview states
they are functionally equivalent to `eleven_flash_v2_5` and `eleven_flash_v2`
with higher average latency. Do not select them for new work.

The official guidance recommends `eleven_v4` or `eleven_multilingual_v2` when
quality matters and `eleven_v4_turbo` or a Flash model when latency matters.
The v3 prompting guide also notes that professional voice clones are not fully
optimized for `eleven_v3` and recommends v4 for production clone quality.
Record the exact `model_id` in every provenance entry.

## Voice selection

### Listing voices

ElevenLabs voices are identified by `voice_id`. List the voices the account can
use, including premade library voices and the account's own clones:

```bash
printf 'xi-api-key: %s\n' "$ELEVENLABS_API_KEY" | curl --silent --show-error --fail \
  --connect-timeout 10 \
  --max-time 30 \
  --request GET \
  --url "https://api.elevenlabs.io/v2/voices?page_size=100&category=premade" \
  --header @-
```

The response contains a `voices` array with `voice_id`, `name`, `category`
(`premade`, `cloned`, `generated`, or `professional`), and `labels`, plus
`has_more` and `next_page_token` for pagination. Paginate on `has_more`; the
list is a live snapshot and `total_count` can change between pages. Voice
Library voices are not available through the API on the free tier. Record the
selected `voice_id` and `name` in provenance rather than relying on the name
alone, because names are not unique.

### Instant voice clone

For a project-owned voice, create an instant voice clone once and reuse its
`voice_id`. The endpoint takes multipart form data, not JSON:

| Item | Value |
| -- | -- |
| Method | `POST` |
| URL | `https://api.elevenlabs.io/v1/voices/add` |
| Request type | `multipart/form-data` |
| Required fields | `name` (string), `files` (one or more audio files) |
| Optional fields | `description`, `labels` (JSON object string), `remove_background_noise` (boolean) |
| Success | `200` with `{ "voice_id": "...", "requires_verification": false }` |

The overview describes instant cloning as working from short samples of under
two minutes. Use clean recordings with minimal background noise, and use only
voices and recordings for which the project has the necessary rights and
consent. Professional voice cloning is a separate higher-fidelity workflow that
requires a Creator plan or above and voice verification; it is out of scope
here.

This Python example creates a clone and then synthesizes one line with it,
streaming the result to disk under a byte limit. It is a standalone script
using the `httpx` package; the repository has no Python toolchain, and the
Node.js example further down is the one that matches the repository:

```python
import json
import os
from pathlib import Path

import httpx

api_key = os.environ["ELEVENLABS_API_KEY"]
model_id = os.environ.get("ELEVENLABS_TTS_MODEL_ID", "eleven_multilingual_v2")
headers = {"xi-api-key": api_key}
max_audio_bytes = 25 * 1024 * 1024
output_path = Path("cloned-line.mp3")
partial_path = output_path.with_suffix(".mp3.part")

with Path("reference.wav").open("rb") as sample:
    clone = httpx.post(
        "https://api.elevenlabs.io/v1/voices/add",
        headers=headers,
        data={
            "name": "Project narrator",
            "description": "Consented studio recording, 2026-10-07",
            "labels": json.dumps({"language": "en"}),
            "remove_background_noise": "false",
        },
        files={"files": ("reference.wav", sample, "audio/wav")},
        timeout=120.0,
    )
clone.raise_for_status()
voice_id = clone.json()["voice_id"]

try:
    with httpx.stream(
        "POST",
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        params={"output_format": "mp3_44100_128"},
        json={"text": "Spoken in the cloned voice.", "model_id": model_id},
        headers={**headers, "Content-Type": "application/json"},
        timeout=120.0,
    ) as response:
        response.raise_for_status()
        received_bytes = 0
        with partial_path.open("xb") as output:
            for chunk in response.iter_bytes():
                received_bytes += len(chunk)
                if received_bytes > max_audio_bytes:
                    raise ValueError("ElevenLabs response exceeded the byte limit")
                output.write(chunk)
    partial_path.replace(output_path)
except Exception:
    partial_path.unlink(missing_ok=True)
    raise
```

Clone creation is a one-time administrative step; keep it out of the per-line
generation path and record the resulting `voice_id`, sample provenance, and
consent evidence together.

## Multi-speaker dialogue

ElevenLabs serves multi-speaker synthesis through a separate endpoint,
`POST /v1/text-to-dialogue`, rather than speaker tags in `text`. Each input
carries its own `voice_id`, so no single-voice path parameter is used.

| Item | Value |
| -- | -- |
| URL | `https://api.elevenlabs.io/v1/text-to-dialogue` |
| Query | `output_format` (default `mp3_44100_128`), `enable_logging` |
| Required body field | `inputs`: array of `{ "text", "voice_id" }` |
| Default `model_id` | `eleven_v3` |
| Limits | At most 10 distinct voices per request; about 2,000 characters total across inputs for reliable output |
| Other fields | `language_code`, `settings` (`stability`, `similarity`), `seed`, `apply_text_normalization`, `pronunciation_dictionary_locators`, `previous_text`, `future_text`, request-ID stitching, `use_pvc_as_ivc` |

```bash
export SCOUT_VOICE_ID="voice-id"
export WARDEN_VOICE_ID="voice-id"

printf 'xi-api-key: %s\n' "$ELEVENLABS_API_KEY" | curl --silent --show-error --fail \
  --connect-timeout 10 \
  --max-time 120 \
  --max-filesize 26214400 \
  --request POST \
  --url "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128" \
  --header @- \
  --header "Content-Type: application/json" \
  --data "{
    \"model_id\": \"eleven_v3\",
    \"inputs\": [
      { \"text\": \"Is the path clear?\", \"voice_id\": \"${SCOUT_VOICE_ID}\" },
      { \"text\": \"[whispers] Not yet. Wait for my signal.\", \"voice_id\": \"${WARDEN_VOICE_ID}\" }
    ]
  }" \
  --output dialogue.mp3
```

The voice IDs above are illustrative. The response is a single audio file
containing the whole exchange. For separately mixable lines, make one
`text-to-speech` request per line instead and use `previous_text` and
`next_text` for continuity.

## Output formats

`output_format` values follow `codec_sample_rate_bitrate`. The enum below is
the endpoint reference as verified on 2026-10-07; recheck it before adopting a
value in tooling.

| Codec | Values | Notes |
| -- | -- | -- |
| MP3 | `mp3_22050_32`, `mp3_24000_48`, `mp3_44100_32`, `mp3_44100_64`, `mp3_44100_96`, `mp3_44100_128`, `mp3_44100_192` | `mp3_44100_192` requires the Creator tier or above. |
| Opus | `opus_48000_32`, `opus_48000_64`, `opus_48000_96`, `opus_48000_128`, `opus_48000_192` | 48 kHz only. |
| WAV | `wav_8000`, `wav_16000`, `wav_22050`, `wav_24000`, `wav_32000`, `wav_44100`, `wav_48000` | 16-bit PCM in a WAV container. 44.1 kHz requires the Pro tier or above. |
| Raw PCM | `pcm_8000`, `pcm_16000`, `pcm_22050`, `pcm_24000`, `pcm_32000`, `pcm_44100`, `pcm_48000` | 16-bit signed little-endian, no container. 44.1 kHz requires the Pro tier or above. |
| Telephony | `ulaw_8000`, `alaw_8000` | 8 kHz μ-law and A-law. Not useful for game audio. |

Choose the output extension from the codec. The REST endpoint returns the whole
file for one complete `text`; the separate `/stream`, `/with-timestamps`, and
WebSocket endpoints exist for incremental delivery and word timing and are out
of scope here.

## Server-side JavaScript example

This example streams a successful response to a file without buffering the full
audio in memory:

```javascript
import { createWriteStream } from "node:fs";
import { rename, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
const modelId = process.env.ELEVENLABS_TTS_MODEL_ID ?? "eleven_multilingual_v2";
const maxAudioBytes = 25 * 1024 * 1024;
const outputPath = "distant-bell.mp3";
const partialPath = `${outputPath}.part`;

if (!apiKey || !voiceId) {
  throw new Error("ElevenLabs text-to-speech is not configured");
}

const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`);
endpoint.searchParams.set("output_format", "mp3_44100_128");

const response = await fetch(endpoint, {
  method: "POST",
  signal: AbortSignal.timeout(120_000),
  headers: {
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "A distant bell rings across the valley.",
    model_id: modelId,
  }),
});

const requestId = response.headers.get("request-id") ?? "unavailable";

if (!response.ok) {
  throw new Error(`ElevenLabs request failed with HTTP ${response.status} requestId=${requestId}`);
}

if (!response.body) {
  throw new Error("ElevenLabs returned no response body");
}

async function* limitAudioBytes(body) {
  let receivedBytes = 0;

  for await (const chunk of Readable.fromWeb(body)) {
    receivedBytes += chunk.byteLength;
    if (receivedBytes > maxAudioBytes) {
      throw new Error("ElevenLabs response exceeded the byte limit");
    }
    yield chunk;
  }
}

try {
  await pipeline(limitAudioBytes(response.body), createWriteStream(partialPath, { flags: "wx" }));
  await rename(partialPath, outputPath);
} catch (error) {
  await unlink(partialPath).catch(() => undefined);
  throw error;
}
```

This code belongs in a hand-run Node.js script (the repository requires Node
22.12 or newer, which has `fetch` built in), not in the browser bundle.

## Responses and errors

### Success

| Status | Body | Handling |
| -- | -- | -- |
| `200` | Binary audio | Save or stream using the extension implied by `output_format`. Do not parse it as JSON. |

The endpoint reference does not promise a filename or a JSON envelope. The
caller owns file naming and storage. Retain the `request-id` response header
when present; it is the value ElevenLabs support asks for and the value used
for request stitching.

### Failure

Most ElevenLabs errors use this JSON shape:

```json
{
  "detail": {
    "type": "authentication_error",
    "code": "invalid_api_key",
    "message": "Invalid API key",
    "request_id": "..."
  }
}
```

`detail.code` is the stable identifier to branch on; `detail.status` is a
legacy field. Validation failures on this endpoint return `422` with `detail`
as an array:

```json
{
  "detail": [
    {
      "loc": ["body", "voice_settings", "stability"],
      "msg": "Input should be less than or equal to 1",
      "type": "less_than_equal"
    }
  ]
}
```

The endpoint reference explicitly declares `422`. The general API error guide
documents the other statuses below.

| Status | Meaning | Action |
| -- | -- | -- |
| `400` | Invalid request or unsupported option | Correct the parameters, model, or output format. |
| `401` | Missing or invalid API key | Check the `xi-api-key` header and server configuration. |
| `402` | Insufficient credits | Check the account balance and the key's credit quota. |
| `403` | Key is not permitted to use the resource | Check key scope, IP allowlist, and plan entitlement. |
| `404` | Voice, model, or dictionary not found | Check the `voice_id`, `model_id`, or dictionary locator. |
| `409` | Request conflicts with resource state | Re-read the resource before retrying. |
| `422` | Request validation failed | Read the validation array and correct the named field. |
| `429` | `rate_limit_exceeded` or `concurrent_limit_exceeded` | Back off with bounded exponential delay and jitter; for concurrency, wait for in-flight requests rather than adding parallelism. |
| `500` | ElevenLabs internal failure | Retry with bounded exponential backoff; escalate persistent failures with the `request_id`. |
| `503` | Service unavailable or maintenance | Retry with bounded exponential backoff. |

Retry only `429`, `500`, and `503` automatically. Other `4xx` responses require
a request, permission, credential, or billing change. Rate and concurrency
limits depend on the subscription tier; consult the current
[API pricing page](https://elevenlabs.io/pricing/api) instead of hard-coding a
plan limit into the integration.

## Integration checklist

- Keep `ELEVENLABS_API_KEY` in `.env` and outside source control and
  browser-delivered code.
- Restrict the key to the Text to Speech scope, a credit quota, and an IP
  allowlist where the environment supports it.
- Set `model_id` explicitly on every request and record it with the output.
- Select the voice by `voice_id`; record the ID, name, category, and, for
  clones, the sample provenance and consent evidence.
- Match the output filename and decoder to `output_format`, and confirm the
  plan allows the chosen format.
- Treat a successful body as binary and an error body as JSON.
- Use multipart form data for voice cloning and JSON for synthesis; do not mix
  them.
- Put timeouts and size limits around generation and downstream storage.
- Retry only rate-limit, concurrency, and transient server failures.
- Avoid logging API keys, full synthesis text, or reference-audio bytes.
- Confirm consent, provenance, and allowed use for every cloned voice, and
  verify a paid entitlement before any commercial use of generated audio.
- Recheck the endpoint reference, model lineup, pricing, and rate limits before
  a production rollout.

## Source maintenance

Reverify this guide when ElevenLabs changes its endpoint reference, model
lineup, output formats, SDK behavior, pricing, or rate-limit documentation. The
primary sources are:

- [Create speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Models overview](https://elevenlabs.io/docs/overview/models)
- [Text-to-speech capability overview](https://elevenlabs.io/docs/overview/capabilities/text-to-speech)
- [Text-to-dialogue endpoint](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)
- [Voice search endpoint](https://elevenlabs.io/docs/api-reference/voices/search)
- [Instant voice clone endpoint](https://elevenlabs.io/docs/api-reference/voices/ivc/create)
- [Prompting controls](https://elevenlabs.io/docs/best-practices/prompting/controls)
- [API authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [API keys and restrictions](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys)
- [API errors](https://elevenlabs.io/docs/eleven-api/resources/errors)
- [API pricing](https://elevenlabs.io/pricing/api)
