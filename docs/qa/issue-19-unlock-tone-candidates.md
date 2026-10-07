# Issue #19: ElevenLabs unlock tone candidates

Four generated alternatives to the ffmpeg sine tone in
[issue-19-lifecycle.md §1](issue-19-lifecycle.md). They are candidates for
review by ear, committed so they can be compared on a device. None is adopted:
the proof scene still plays `public/proof/unlock-tone.mp3`, and
`src/diagnostics/proofAssets.ts` is unchanged.

Files under `docs/qa/issue-19/unlock-tone-candidates/`:

- `ping-1.mp3`, `ping-2.mp3`, `blip-1.mp3`, `blip-2.mp3`: trimmed, faded,
  peak-normalised mono MP3 exports, ready to audition or to swap in.
- `provider/<same name>.mp3`: the untouched provider bytes each export was
  made from.

## Generation

Run on 2026-10-07 with ElevenLabs Sound Effects v2 (`eleven_text_to_sound_v2`)
through the ElevenLabs connector's flow canvas (flow
`Tactics Guru unlock tone candidates`, id `7apPEyogzTQY5lIz4t3a`), not through
the REST script in [docs/media-gen/sound-fx-api.md](../media-gen/sound-fx-api.md).
No API key was read from this repository. Two generations per prompt; each
cost 5 credits. Parameters for every generation: `duration_seconds` 0.5,
`prompt_influence` 0.4, `loop` false.

| Direction | Prompt |
| --- | --- |
| ping | `Soft single bell-like interface confirmation ping, bright clean attack, fast decay, close and dry, no reverb tail, no voice, no words, no music` |
| blip | `Two quick ascending synth blips, crisp short tactical interface confirmation, dry, immediate stop, no voice, no words, no music` |

Provider output for all four: MP3, 44.1 kHz, stereo, 128 kb/s, 0.48 s
reported, 25,947 bytes. Peak and RMS are over the whole file; "audible end"
is where `silencedetect` (−45 dB, 20 ms) found the tail going silent.

| Provider file | Generation id | SHA-256 | Peak (dBFS) | RMS (dBFS) | Audible end |
| --- | --- | --- | ---: | ---: | ---: |
| `provider/ping-1.mp3` | `36edd38S2pfGjCYmggt7` | `28354cbfc46d64d12459fbb2f28f5e0fb81e34af0b5f3c16f62aec25d965ba23` | −10.12 | −29.29 | 0.324 s |
| `provider/ping-2.mp3` | `C6YjyAG3mlUDbKEeHQV8` | `42ab47ea9b5819b0397df52cdfd40ee85037dfba58254f36d663a51ee0ee220a` | +0.14 | −18.18 | 0.392 s |
| `provider/blip-1.mp3` | `iFT8kOL0Anf96lOviIqw` | `2d9b4cdfbf5fc9e4bb25c50c857c859947ad536fb080279a059890cfd84f92d0` | −5.37 | −18.44 | 0.264 s |
| `provider/blip-2.mp3` | `eBsJfSF1OtUBeERQUkgH` | `1b84e824f78c9a41b5f24089d3bc19ac1edf3d20a4c2ee13c5fad1786716e6c2` | −3.17 | −14.23 | 0.336 s |

## Processing

`ffmpeg version 8.1.1` (Ubuntu build), the same options as the sine tone:
bitexact, no metadata, mono, 44.1 kHz, `libmp3lame` 64 kb/s. Each candidate
was trimmed just past its audible end, given a 5 ms fade in and a 10 ms fade
out, peak-normalised to −1 dBFS after downmix, then encoded. `END` and
`GAIN` per file are in the table below; `FADE_OUT_START` is `END − 0.01`.

```sh
ffmpeg -i provider/NAME.mp3 \
  -af "atrim=0:END,afade=t=in:st=0:d=0.005,afade=t=out:st=FADE_OUT_START:d=0.01" \
  -ac 1 -ar 44100 -c:a pcm_s16le -fflags +bitexact -flags:a +bitexact -map_metadata -1 NAME.trim.wav
# GAIN = -1.0 - (astats overall Peak level of NAME.trim.wav), rounded to 0.01 dB
ffmpeg -i NAME.trim.wav -af "volume=GAINdB" -c:a pcm_s16le \
  -fflags +bitexact -flags:a +bitexact -map_metadata -1 NAME.wav
ffmpeg -i NAME.wav -c:a libmp3lame -b:a 64k -fflags +bitexact -flags:a +bitexact \
  -map_metadata -1 -id3v2_version 0 -write_xing 0 NAME.mp3
```

| Export | END | Trimmed peak | GAIN | Bytes | SHA-256 | Decoded | Peak (dBFS) | RMS (dBFS) |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| `ping-1.mp3` | 0.34 s | −13.81 dBFS | +12.81 dB | 3,134 | `037143d13e5e3f78324420b077ab4ecba8577a99569665c275aee5dd96bd27c4` | 0.392 s | −1.08 | −17.73 |
| `ping-2.mp3` | 0.40 s | −5.33 dBFS | +4.33 dB | 3,552 | `a159647837c3a88fe4ce113a0367222d7b6279f969fbed0fa25d0db0caa8fbcf` | 0.444 s | −1.29 | −16.55 |
| `blip-1.mp3` | 0.28 s | −5.51 dBFS | +4.51 dB | 2,507 | `96d81f59211dfe90b0348229305885ea19af0af84e991d901d918b992798c60d` | 0.313 s | −1.37 | −12.59 |
| `blip-2.mp3` | 0.35 s | −5.27 dBFS | +4.27 dB | 3,134 | `cda53c511bf9c31ebdea2fa23d2f13d1715c236c9ab34a80cd206b368733ab9c` | 0.392 s | −1.57 | −9.65 |

Decoded length exceeds `END` by the MP3 encoder padding, as with the sine
tone. Intermediate WAVs are not committed; their hashes, for anyone
reproducing the exports: `ping-1` `4b51ec20d60ac762e4769657e14984b7f0887337f4aec30f9912b95e57e56da3`,
`ping-2` `54ba956f4780662021b03c938e3dc7dc50f25bcf4f71225db60b9b84d5992dae`,
`blip-1` `395ac6bc6a1957c24ebd42f56e050804486ff29773744acbadcd4aedb4873093`,
`blip-2` `5f497fda6a04a2819202eb2ba0d6638061d459c43577ff0d92b4ef40f02a9e40`.

## Review notes

The candidates have not been auditioned; the measurements above are the only
assessment so far. Points to check by ear: `ping-1` needed 12.8 dB of gain,
so listen for noise floor; `ping-2` left the provider at +0.14 dBFS, so listen
for clipping in the attack; `blip-2` is the loudest by RMS. The sine tone
stays the committed asset until a candidate is chosen.

## Adopting a candidate

1. Copy the chosen export over `public/proof/unlock-tone.mp3`.
2. Re-encode `public/proof/unlock-tone.ogg` from the same candidate's WAV
   with the `libvorbis -q:a 3` command in [issue-19-lifecycle.md §1](issue-19-lifecycle.md),
   so the decode-only probe still comes from the same source as the played file.
3. Update the bytes and SHA-256 in the comment in `src/diagnostics/proofAssets.ts`
   and in the table in issue-19-lifecycle.md §1, and point that section here
   for the generation record.
4. Re-run `npm test`: the audio checks assert on the key, not on the bytes,
   so they should pass unchanged. The lifecycle timeout is duration plus
   1,000 ms, which every candidate is well inside.
