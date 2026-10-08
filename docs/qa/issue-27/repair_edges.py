"""Offline v1 terrain repair: python3 docs/qa/issue-27/repair_edges.py.
Requires Pillow and NumPy; neither is an application dependency.
"""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
IDS = ['grass', 'grass_path', 'stone', 'forest', 'water']
SOURCE_BAND = 64
RUNTIME_BAND = 16


def repair(image, band):
    """Symmetric cosine blend falls from 0.5 at border to zero at band end.

    Equal-distance pixels from opposing edges share a common blend. Each
    pass modifies only edge strips; corner consistency survives both passes.
    """
    pixels = np.asarray(image, dtype=np.float64).copy()
    for axis in (1, 0):
        original = pixels.copy()
        for distance in range(band):
            weight = (1 + np.cos(np.pi * distance / (band - 1))) / 4
            near = [slice(None)] * 3
            far = [slice(None)] * 3
            near[axis] = distance
            far[axis] = pixels.shape[axis] - 1 - distance
            near, far = tuple(near), tuple(far)
            pixels[near] = (1 - weight) * original[near] + weight * original[far]
            pixels[far] = (1 - weight) * original[far] + weight * original[near]
    return Image.fromarray(np.rint(pixels).clip(0, 255).astype(np.uint8))


def checks(before, after, band):
    original = np.asarray(before)
    fixed = np.asarray(after)
    assert before.size == after.size and after.mode == 'RGB'
    assert np.array_equal(original[band:-band, band:-band], fixed[band:-band, band:-band])
    assert np.array_equal(fixed[:, 0], fixed[:, -1])
    assert np.array_equal(fixed[0], fixed[-1])
    return {'centralPixelsUnchanged': True, 'oppositeEdgePixelsEqual': True,
            'bandPixels': band, 'size': list(after.size)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = json.loads((ROOT / 'manifest-v1.json').read_text())
assert [a['terrainId'] for a in manifest['assets']] == IDS
manifest['revision'] = 'v1-edge-repaired'
manifest['approval'] = None
manifest['repair'] = {'script': 'docs/qa/issue-27/repair_edges.py',
                      'method': 'symmetric opposing-edge cosine blend, then rounded RGB PNG',
                      'sourceBandPixels': SOURCE_BAND, 'runtimeBandPixels': RUNTIME_BAND,
                      'centralPreservation': 'central 87.5% on each axis; bit-for-bit v1 pixels',
                      'note': 'Equal border pixels remove color jumps; inspect blending/ghosting and repeated motifs visually.'}
contact = Image.new('RGB', (1280, 284), '#eeeeee')
repeats = Image.new('RGB', (1536, 2384), '#eeeeee')
comparison = Image.new('RGB', (1536, 3960), '#eeeeee')
tiles = []
proof = {}
for i, asset in enumerate(manifest['assets']):
    material = asset['terrainId']
    proof[material] = {}
    asset['status'] = 'pending-review'
    for kind, band in [('source', SOURCE_BAND), ('runtime', RUNTIME_BAND)]:
        original_path = REPO / asset[kind]
        assert sha(original_path) == asset[kind + 'Sha256']
        before = Image.open(original_path).convert('RGB')
        assert list(before.size) == asset[kind + 'Size']
        fixed = repair(before, band)
        output = ROOT / 'candidates' / f'{material}-{kind}-v1-edge.png'
        fixed.save(output, optimize=True)
        reopened = Image.open(output)
        assert reopened.format == 'PNG'
        proof[material][kind] = checks(before, reopened, band)
        asset[kind + 'Reference'] = asset[kind]
        asset[kind + 'ReferenceSha256'] = asset[kind + 'Sha256']
        asset[kind] = str(output.relative_to(REPO))
        asset[kind + 'Sha256'] = sha(output)
    asset['runtimeBytes'] = (REPO / asset['runtime']).stat().st_size
    asset['productionNotes'] += ' Scripted repair authorized by Brian on 2026-10-08. Source and runtime repaired independently from exact v1 files; no interior regeneration, rotation or palette change. Source bands 64px; runtime bands 16px. Prior v1 generation provenance retained. New exact exports require review.'
    tile = Image.open(REPO / asset['runtime'])
    tiles.append(tile)
    contact.paste(tile, (i * 256, 28))
    ImageDraw.Draw(contact).text((i * 256 + 8, 8), material, fill='black')
    x, y = (i % 2) * 768, (i // 2) * 792
    ImageDraw.Draw(repeats).text((x + 8, y + 8), material, fill='black')
    before = Image.open(REPO / asset['runtimeReference'])
    for column, candidate in enumerate([before, tile]):
        cx, cy = column * 768, i * 792
        ImageDraw.Draw(comparison).text((cx + 8, cy + 8), material + (' v1' if column == 0 else ' edge repaired'), fill='black')
        for a in range(3):
            for b in range(3):
                comparison.paste(candidate, (cx + a * 256, cy + 24 + b * 256))
    for a in range(3):
        for b in range(3):
            repeats.paste(tile, (x + a * 256, y + 24 + b * 256))
adjacent = Image.new('RGB', (1280, 1280))
for y in range(5):
    for x in range(5):
        adjacent.paste(tiles[(x + y) % 5], (x * 256, y * 256))
for name, preview in [('contact', contact), ('repeat', repeats), ('comparison', comparison), ('adjacent', adjacent)]:
    preview.save(ROOT / f'{name}-v1-edge.png', optimize=True)
# Preserve approval only while regenerated exports match the approved exact hashes.
existing_path = ROOT / 'manifest-v1-edge.json'
if existing_path.exists():
    receipt = json.loads(existing_path.read_text()).get('approval')
    exports = [{key: asset[key] for key in ('terrainId', 'source', 'sourceSha256', 'runtime', 'runtimeSha256')} for asset in manifest['assets']]
    if receipt and receipt.get('exports') == exports:
        manifest['approval'] = receipt
        for asset in manifest['assets']:
            asset['status'] = 'approved'
(ROOT / 'manifest-v1-edge.json').write_text(json.dumps(manifest, indent=2) + '\n')
(ROOT / 'edge-proof-v1.json').write_text(json.dumps(proof, indent=2) + '\n')
print('PASS: five IDs; ten RGB PNG sizes/hashes; unchanged interiors; exactly equal opposing border pixels.')
print('Runtime total:', sum(a['runtimeBytes'] for a in manifest['assets']))
