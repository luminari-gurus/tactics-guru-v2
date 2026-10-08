import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROOF_ART, PROOF_ASSETS, PROOF_COLD_ASSET_BUDGET_BYTES, PROOF_EXPORT, PROOF_IMAGES } from '../../src/diagnostics/proofAssets';

// Image and audio extensions on the release allowlist (restart plan §5.1, tech design §7.2).
const RELEASE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.mp3', '.ogg', '.wav'];

/** `public/` is copied into `dist/` unhashed, so a manifest URL is the path under it. */
function publicFile(url: string): Buffer { return readFileSync(`public${url}`); }

/** Pixel size from a PNG IHDR or a WebP `VP8 `, `VP8L` or `VP8X` header, without decoding. */
function imageSize(file: Buffer): { width: number; height: number } {
  if (file.toString('latin1', 1, 4) === 'PNG') return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
  if (file.toString('latin1', 0, 4) !== 'RIFF' || file.toString('latin1', 8, 12) !== 'WEBP') throw new Error('Not a PNG or WebP file');
  const chunk = file.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') { const bits = file.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }; }
  if (chunk === 'VP8X') return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 };
  throw new Error(`Unknown WebP chunk ${chunk}`);
}

const image = (key: string) => PROOF_IMAGES.find(asset => asset.key === key)!;
const exportSize = (logicalPx: number, densityCap: number) => Math.ceil(logicalPx * PROOF_EXPORT.maxBoardZoom * densityCap);

describe('proof asset exports (#35, restart plan §5.1)', () => {
  it('ships only release-allowlisted formats', () => {
    for (const asset of PROOF_ASSETS) expect(RELEASE_EXTENSIONS, asset.url).toContain(extname(asset.url));
  });

  it('exports the tree at its largest drawn size × maximum board zoom × canvas density cap', () => {
    expect(imageSize(publicFile(image('tree').url))).toEqual({
      width: exportSize(PROOF_ART.tree.width, PROOF_EXPORT.canvasDensityCap),
      height: exportSize(PROOF_ART.tree.height, PROOF_EXPORT.canvasDensityCap),
    });
  });

  it('exports the DOM portrait at its CSS size × DOM density cap', () => {
    const side = PROOF_EXPORT.portraitCssPx * PROOF_EXPORT.domDensityCap;
    expect(imageSize(publicFile(image('fighter-portrait').url))).toEqual({ width: side, height: side });
  });

  it('keeps every file the scene requests on a cold load within the #20 L4 budget', () => {
    const files = PROOF_ASSETS.map(asset => ({ url: asset.url, bytes: publicFile(asset.url).length }));
    const total = files.reduce((sum, file) => sum + file.bytes, 0);
    expect(total, JSON.stringify(files)).toBeLessThanOrEqual(PROOF_COLD_ASSET_BUDGET_BYTES);
  });
});
