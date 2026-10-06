# Transparent grass surface edit

Tool: built-in `image_gen`, transparent_background=true. Edit target: the canonical `art/tiles/grass_detailed_N.png` at the source revision recorded in the parent QA note. The output is an edited derivative, not an exact pixel extraction.

Final prompt:

> Use case: background-extraction. Edit target: the supplied canonical grass tile PNG. Extract ONLY its existing grassy TOP SURFACE into a clean transparent isometric diamond tile. Preserve the existing grass, tiny flowers, stones, palette and texture as faithfully as possible; do not redesign or add objects. Remove all dirt side walls, orange underside, black bands, shadows outside the diamond and original excess padding. Straight precise diamond silhouette with 2:1 width-to-height ratio, symmetric vertices at top, right, bottom and left; surface fills the entire diamond. Center the diamond on a genuinely transparent RGBA background with tight bounds. No tile thickness, no bevel, no border, no background, no text. This is an extraction/normalization of existing art for a game, not new terrain art.
