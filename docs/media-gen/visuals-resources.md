# Free visual asset sources

Status: Reference. A starting list of sites for art, textures and icons;
nothing here is a dependency or an accepted asset.

Scope: where to look for free 2D art, textures and icons, and how each find
is recorded before it is committed. Excludes generated art (recorded per
asset in `docs/qa/`, see
[`docs/qa/issue-16-assets.md`](../qa/issue-16-assets.md)).

Project fit: the first slice needs isometric terrain tiles, single-frame unit
sprites, portraits, a few props and HUD icons for a browser tactics game
([tech design §4.3, §5, §7](../tech_design.phaser4.draft.md)). The legacy
tiles used Kenney Sketch Town as a style reference; the proof board now uses
generated grass and tree art and copies of the legacy fighter sprite and
portrait.

Last verified: the site descriptions below were copied from aggregator lists
on 2026-07-15 and were **not** re-checked on each site on 2026-10-07.

Rules shared by every asset route in this folder are in [README.md](README.md).

## What the game needs

| Asset type | Shape the renderer expects | Where it comes from today |
| -- | -- | -- |
| Terrain tiles | Top-down material or 2:1 isometric diamond; the proof board draws 80×40 tiles with 24-pixel elevation steps and supplies all geometry itself, so a square, seamless, direction-neutral material is the easiest input | Generated grass material (`public/proof/grass-material-v1.png`) |
| Props | Upright RGBA PNG, transparent background, root anchor recorded | Generated tree (`public/proof/tree-grass-v1.png`) |
| Unit sprites | 64×80 single-frame PNG, feet anchor at bottom centre; tweens, not sprite sheets, animate them | Legacy `fighter.png` |
| Portraits | Shown as DOM images; downscale to the largest HUD size × DPR cap and encode as WebP before shipping | Legacy `fighter-portrait.png`, 3.3 MB, not yet optimised |
| HUD icons | SVG or PNG; `.svg` is on the release allowlist; ≥44 CSS px hit targets | None yet; the HUD arrives with issue #10 |

Shippable image types are `.png .jpg .jpeg .webp .svg .ico` (restart plan
§5.1). AVIF is not allowlisted. 3D model sites are listed below only because
a rendered 3D model can be the source of a 2D sprite; the game ships no 3D.

## Recording a find

Every file that may be committed gets a record before the commit (tech
design §7.2):

- source URL, author and download date;
- the original file's bytes and SHA-256, and the same for any edited export;
- edits made (crop, resize, recolour, re-encode) and the commands used; and
- dimensions and anchor.

Today that record is a QA note under `docs/qa/` (the issue #16 note is the
model). When the asset manifest exists, it becomes one manifest row per file.

## Game art and general visual assets

| Site | What you get | Fit for this project |
| -- | -- | -- |
| [Kenney.nl](https://kenney.nl) | 40k+ 2D sprites, tilesets, UI, plus 3D models and audio | Isometric and UI packs; the legacy tiles' style reference; also UI audio |
| [Quaternius](https://quaternius.com) | Low-poly 3D characters, props, environments | Render to 2D sprites only |
| [Poly Haven](https://polyhaven.com) | 3D models, HDRIs, PBR textures | Ground materials for tiles |
| [AmbientCG](https://ambientcg.com) | PBR materials and textures | Seamless ground materials for tiles |
| [Texture Ninja](https://texture.ninja) | 5,000+ photo textures and patterns | Tile and prop materials |
| [itch.io game assets](https://itch.io/game-assets) | 2D sprites, tilesets, icons, free and paid packs | Niche styles; filter by tag |
| [Game Assets Garden](https://gameassetsgarden.com) | Sprites, tiles, UI in one style | Consistent-style packs |
| GameAssets.com | Large public-domain collection | Unverified; the listing came from a social-media post |
| [Poly Pizza](https://poly.pizza) | Low-poly 3D models | Render to sprites |
| [Pixabay](https://pixabay.com) | Photos, illustrations, vectors | Backgrounds and reference; not a drop-in sprite source |
| [Lospec](https://lospec.com) | Pixel-art palettes and curated links | Palette discipline for pixel-art tiles |
| [OpenGameArt.org](https://opengameart.org) | 2D sprites, tilesets, textures, 3D, music, SFX | Strong for isometric tiles and SFX; record the author with each download |
| [CraftPix free section](https://craftpix.net/freebies/) | Free sprites and themed packs | Fantasy sprites and tiles |
| [Sketchfab free models](https://sketchfab.com) | 3D models | Render to sprites only |
| [TurboSquid free section](https://www.turbosquid.com) | 3D models | Render to sprites only |

## Icons and UI graphics

| Site | What you get | Fit for this project |
| -- | -- | -- |
| [Icons8](https://icons8.com) | UI icons in many styles | HUD icons |
| [IconScout](https://iconscout.com/free-icons) | Large icon library | HUD and settings icons |
| [UXWing](https://uxwing.com) | SVG and PNG icons | Clean HUD icons |
| [Reshot](https://www.reshot.com) | Icons and illustrations | Illustrative UI |
| [GraphicBurger](https://graphicburger.com) | Icon and UI kits | Icon and UI kits |
| [Freepik](https://www.freepik.com) | Vectors, PSDs, illustrations | Portrait or background reference |
| [Game-Icons.net](https://game-icons.net) | Thousands of SVG game-mechanic icons | Ability, status and terrain icons for the HUD |
| [SVGRepo](https://www.svgrepo.com) | Large SVG library | Large SVG library |

## Aggregators

- [awesome-cc0](https://github.com/madjin/awesome-cc0): a maintained list of
  free sources across 3D, textures, clip art, game assets and audio.
- [Hackingtons free game art](https://www.hackingtons.com/free-game-art):
  compares the major hubs.
- [GameIdea free game assets](https://gameidea.org/complete-list-of-free-game-assets/):
  long list of 2D, 3D, texture and audio sources.
- [AssetHoard 2026 list](https://assethoard.com/blog/where-to-find-free-game-assets-2026)
  and [Cinevva guide](https://app.cinevva.com/guides/game-assets-guide):
  newer lists.
- [r/gamedev 50+ sites list](https://www.reddit.com/r/gamedev/comments/1m76pm4/the_ultimate_free_game_dev_asset_list_50_sites/):
  community list.

## Practical rules for this repository

- Record each find as above before committing it.
- Shipped files go through the Vite asset graph into `dist/assets/` once the
  manifest exists; `public/proof/` is for the diagnostic only.
- Optimise before committing: tiles near their drawn size, portraits as
  WebP at HUD size, sprites unchanged. Record the commands.
- Do not mix a downloaded tile set with generated tiles in one board without
  a visual check; the proof board's generated grass and tree set the current
  style.
