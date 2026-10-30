# Portrait main menu (#153)

The menu is a native HTML surface with separate background, title-image and
ordered control layers. Its column is at most 32rem on wider displays and scrolls
at short heights. Safe-area padding, visible focus and 48px controls are retained.
Dawn Beyond the Ivy Ruins is the delivered composition. Midnight Strategist’s War
Room is retained as an optimized alternative and compared in Playwright screenshots;
there is no theme switch or randomized background. Dawn keeps the outdoor journey
visible above the scrim while preserving readable controls.

Runtime assets are derived from the caller-supplied originals in
`docs/art/issue-153/source/`. The title keeps its transparent 3:1 aspect ratio and
lettering. `public/menu/dawn.webp` is 269,424 bytes, `midnight.webp` is 234,010
bytes and `title.webp` is 89,178 bytes (see the runtime manifest for exact sizes and
hashes). The unused alternative is not requested during ordinary menu boot.
Background and title failures leave readable fallback text and native controls.

`src/app/routes.ts` is the base-aware route classifier and bounded intent builder.
The production preload script applies the same route boundaries before requesting
engine chunks. Menu inspection imports validators/content through `menuSaves.ts`
and a side-effect-free run context, without importing app hosts. It creates no
sessions, RNG or writes and never exposes save bytes in DOM.

Menu actions use full-page navigation. The closed-set `entry` parameter is removed
from history before use and consumed once. Battle/run/dungeon destinations inspect
again and use existing Continue/recovery owners. New Game always uses the dungeon
confirmation. If a confirmed replacement clears slots but cannot publish its new
save, existing recovery exports retain reviewed old bytes and the destination opens
recovery with unsaved status. Existing save keys/formats/rules are unchanged.

Save inspection refreshes on focus, pageshow, storage changes and action. Menu
dialogs are native, support Escape and restore the invoking control's focus.
Settings reuses privacy controls; collection remains off on the menu. Mode return
links preserve pagehide cleanup and ask before leaving reported unsaved progress.

The `main-menu.spec.ts` suite belongs to the default three-profile Chromium matrix
and the existing two-profile iPhone WebKit acceptance stage. Serial batch selection
includes it exactly once per Chromium project. Existing test identities are retained
while battle navigation changes to `/battle`; explicit root scene diagnostics remain.
