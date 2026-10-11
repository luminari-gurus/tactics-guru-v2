"""Original synthesized cues; Python stdlib + ffmpeg/libmp3lame, no runtime dependency.
Run from the repository root: python3 scripts/generate-battle-audio.py
"""
import math
from pathlib import Path
import struct
import subprocess

# Seconds, start/end frequencies. Outcomes use three stepped notes.
CUES = {
    'move': (.12, [180, 260]), 'miss': (.14, [620, 160]),
    'hit': (.12, [140, 55]), 'critical': (.22, [180, 720]),
    'magic': (.26, [500, 1400]), 'unit-defeat': (.24, [320, 70]),
    'victory': (.42, [523.25, 659.25, 783.99]), 'loss': (.42, [392, 311.13, 261.63]),
}
out = Path('public/audio/battle')
out.mkdir(parents=True, exist_ok=True)
for name, (duration, notes) in CUES.items():
    samples = bytearray()
    phase = 0.
    count = round(duration * 22050)
    for i in range(count):
        t = i / 22050
        frequency = notes[min(2, int(t / duration * 3))] if len(notes) == 3 else notes[0] + (notes[1] - notes[0]) * t / duration
        phase += 2 * math.pi * frequency / 22050
        envelope = min(1, t / .008, (duration - t) / .035) * (1 - .4 * t / duration)
        sample = .20 * envelope * (math.sin(phase) + .2 * math.sin(2 * phase))
        samples.extend(struct.pack('<h', round(sample * 32767)))
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', '22050', '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', '32k', '-write_xing', '1', str(out / f'{name}.mp3')], input=samples, check=True)
