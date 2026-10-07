# Free visual asset sources

Status: Reference. A starting list of sites for art, textures and icons;
nothing here is a dependency or an accepted asset.

Scope: where to look for CC0 and attribution-licensed 2D art, textures and
icons, and how each find has to be recorded before it is committed. Excludes
generated art (recorded per asset in `docs/qa/`, see
[`docs/qa/issue-16-assets.md`](../qa/issue-16-assets.md)) and any legacy
asset review.

Project fit: the first slice needs isometric terrain tiles, single-frame unit
sprites, portraits, a few props and HUD icons for a browser tactics game
([tech design §4.3, §5, §7](../tech_design.phaser4.draft.md)). The legacy
tiles used Kenney Sketch Town (CC0) as a style reference; the proof board now
uses generated grass and tree art and copies of the legacy fighter sprite and
portrait, whose provenance gap is recorded rather than filled.

Last verified: licence claims below were copied from aggregator lists on
2026-07-15 and were **not** re-checked on each site on 2026-10-07. Verify on
the source's own licence page before downloading anything.

Rules shared by every asset route in this folder are in [README.md](README.md).

## What the game needs

| Asset type | Shape the renderer expects | Where it comes from today |
| -- | -- | -- |
| Terrain tiles | Top-down material or 2:1 isometric diamond; the proof board draws 80×40 tiles with 24-pixel elevation steps and supplies all geometry itself, so a square, seamless, direction-neutral material is the easiest input | Generated grass material (`public/proof/grass-material-v1.png`) |
| Props | Upright RGBA PNG, transparent background, root anchor recorded | Generated tree (`public/proof/tree-grass-v1.png`) |
| Unit sprites | 64×80 single-frame PNG, feet anchor at bottom centre; tweens, not sprite sheets, animate them | Legacy `fighter.png`, provenance gap recorded |
| Portraits | Shown as DOM images; downscale to the largest HUD size × DPR cap and encode as WebP before shipping | Legacy `fighter-portrait.png`, 3.3 MB, not yet optimised |
| HUD icons | SVG or PNG; `.svg` is on the release allowlist; ≥44 CSS px hit targets | None yet; the HUD arrives with issue #10 |

Shippable image types are `.png .jpg .jpeg .webp .svg .ico` (restart plan
§5.1). AVIF is not allowlisted. 3D model sites are listed below only because
a rendered 3D model can be the source of a 2D sprite; the game ships no 3D.

## Licence basics

- **CC0 / public domain**: use, modify and redistribute commercially with no
  attribution required. The default to prefer: the game has no credits screen
  yet, and the repository has no LICENSE file.
- **CC BY and similar**: attribution is mandatory, in a credits surface or in
  the repository's asset records. Usable, but it creates an obligation that
  must be designed in (a credits dialog, issue #10 territory).
- **Site-specific free licences** (Pixabay, Freepik, Icons8, Reshot, UXWing):
  read the licence page; "free for commercial use" often carries conditions
  such as a required link, no standalone redistribution, or a daily cap.
- **Mixed hubs** (OpenGameArt, itch.io, Sketchfab): the licence is per asset,
  not per site. Store it with the file.

## Recording a find

Every file that may be committed gets a record before the commit (restart
plan D3, tech design §7.2):

- source URL, author, licence name and version, download date;
- the original file's bytes and SHA-256, and the same for any edited export;
- edits made (crop, resize, recolour, re-encode) and the commands used;
- dimensions and anchor; and
- for CC BY, the attribution text the licence requires.

Today that record is a QA note under `docs/qa/` (the issue #16 note is the
model). When the asset manifest exists, it becomes one manifest row per file.
The owner signs off before the first public commit of any new asset.

## CC0 and no-attribution sources

Suitable for a build with no credits screen; crediting remains a courtesy.

### Game art and general visual assets

| Site | What you get | Licence claim | Fit for this project | Verified on site? |
| -- | -- | -- | -- | -- |
| [Kenney.nl](https://kenney.nl) | 40k+ 2D sprites, tilesets, UI, plus 3D models and audio | CC0 | Isometric and UI packs; the legacy tiles' style reference; also CC0 UI audio | Yes, long-standing CC0 |
| [Quaternius](https://quaternius.com) | Low-poly 3D characters, props, environments | CC0 | Render to 2D sprites only | No |
| [Poly Haven](https://polyhaven.com) | 3D models, HDRIs, PBR textures | CC0 | Ground materials for tiles | No |
| [AmbientCG](https://ambientcg.com) | PBR materials and textures | CC0 | Seamless ground materials for tiles | No |
| [Texture Ninja](https://texture.ninja) | 5,000+ photo textures and patterns | CC0 | Tile and prop materials | No |
| [itch.io, CC0 tag](https://itch.io/game-assets/assets-cc0) | 2D sprites, tilesets, icons | CC0 for the tagged subset; other itch assets vary | Filter by the tag; check each page | Per asset |
| [Game Assets Garden](https://gameassetsgarden.com) | Sprites, tiles, UI in one style | Site claims royalty-free, no attribution | Check the licence page | No |
| GameAssets.com | Large public-domain collection | Claimed CC0 | The claim came from a social-media post; verify on the site | No |
| [Poly Pizza](https://poly.pizza) | Low-poly 3D models | Mix of CC0 and CC BY per model | Render to sprites; read each model's licence | Per asset |
| [Pixabay](https://pixabay.com) | Photos, illustrations, vectors | Pixabay Content License: no attribution, but no standalone redistribution | Backgrounds and reference; not a drop-in sprite source | No |
| [Lospec](https://lospec.com) | Pixel-art palettes and curated links | Palettes free; linked assets vary | Palette discipline for pixel-art tiles | Per asset |

### Icons and UI graphics

| Site | What you get | Licence claim | Fit for this project | Verified on site? |
| -- | -- | -- | -- | -- |
| [Icons8](https://icons8.com) | UI icons in many styles | The free tier normally requires a link; a "no attribution" listing exists | Read the licence page before relying on no-attribution | No |
| [IconScout, no-attribution collection](https://iconscout.com/free-icons/no-attribution) | 2,000+ icons flagged no-attribution | Collection-level claim | HUD and settings icons; check each icon | No |
| [UXWing](https://uxwing.com) | SVG and PNG icons | Own licence, no attribution | Clean HUD icons | No |
| [Reshot](https://www.reshot.com) | Icons and illustrations | Reshot Free License, no attribution | Illustrative UI | No |
| [GraphicBurger](https://graphicburger.com) | Icon and UI kits | Per item, mostly free for commercial use | Read each item's terms | No |

## Attribution or per-asset licence checks required

### Mixed-licence hubs

| Site | What you get | Licence | Fit for this project |
| -- | -- | -- | -- |
| [OpenGameArt.org](https://opengameart.org) | 2D sprites, tilesets, textures, 3D, music, SFX | Per asset: CC0, CC BY, CC BY-SA, GPL and others | Strong for isometric tiles and SFX; store the author and licence with each download |
| [itch.io assets](https://itch.io/game-assets) | Free and paid packs | Varies per pack | Niche styles; licence is per pack |
| [CraftPix free section](https://craftpix.net/freebies/) | Free sprites and themed packs | Per pack; some no-attribution, some conditional | Fantasy sprites and tiles; read the per-pack licence |
| [Sketchfab free models](https://sketchfab.com) | 3D models | CC BY, CC BY-SA, CC0 and custom | Render to sprites only; track attribution |
| [TurboSquid free section](https://www.turbosquid.com) | 3D models | Varied, often restricted | Only if the credit and restrictions are acceptable |

### Illustration and icon sources with attribution

| Site | What you get | Licence | Fit for this project |
| -- | -- | -- | -- |
| [Freepik](https://www.freepik.com) | Vectors, PSDs, illustrations | Free tier requires attribution | Portrait or background reference; attribution must be shipped |
| [Game-Icons.net](https://game-icons.net) | Thousands of SVG game-mechanic icons | CC BY 3.0 | Ability, status and terrain icons for the HUD; needs a credits surface |
| [SVGRepo](https://www.svgrepo.com) | Large SVG library | Mixed; many CC BY, some public domain | Treat each SVG as its own licence unit |

## Aggregators

- [awesome-cc0](https://github.com/madjin/awesome-cc0): a maintained list of
  CC0-only sources across 3D, textures, clip art, game assets and audio.
- [Hackingtons free game art](https://www.hackingtons.com/free-game-art):
  compares the major hubs with "no credit" and "commercial" columns.
- [GameIdea free game assets](https://gameidea.org/complete-list-of-free-game-assets/):
  long list of 2D, 3D, texture and audio sources with licence notes.
- [AssetHoard 2026 list](https://assethoard.com/blog/where-to-find-free-game-assets-2026)
  and [Cinevva guide](https://app.cinevva.com/guides/game-assets-guide):
  newer lists with per-site licence explanations.
- [r/gamedev 50+ sites list](https://www.reddit.com/r/gamedev/comments/1m76pm4/the_ultimate_free_game_dev_asset_list_50_sites/):
  community list that separates CC0 from CC BY.

Aggregator licence columns are summaries. The licence that binds is the one
on the asset's own page on the day it is downloaded; keep a copy or a dated
link in the record.

## Practical rules for this repository

- Prefer CC0 until a credits surface exists. Record attribution anyway.
- Nothing from these sites is committed without the record above and the
  owner's sign-off (D3). The repository is public, so a commit is a
  publication.
- Shipped files go through the Vite asset graph into `dist/assets/` once the
  manifest exists; `public/proof/` is for the diagnostic only.
- Optimise before committing: tiles near their drawn size, portraits as
  WebP at HUD size, sprites unchanged. Record the commands.
- Do not mix a downloaded tile set with generated tiles in one board without
  a visual check; the proof board's generated grass and tree set the current
  style.
