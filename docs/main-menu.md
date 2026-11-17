# Portrait main menu (#153)

The menu is a native HTML surface with separate background, title-image and
ordered control layers. Its column is at most 512px on wider displays and scrolls
at short heights. Safe-area padding, visible focus and 48px controls are retained.
Dawn Beyond the Ivy Ruins is the delivered composition. Midnight Strategist’s War
Room is retained as an optimized alternative and compared in Playwright screenshots;
there is no theme switch or randomized background. Dawn keeps the outdoor journey
visible above the scrim while preserving readable controls.

Runtime assets are derived from the caller-supplied originals in
`docs/art/issue-153/source/`. The title keeps its transparent 3:1 aspect ratio and
lettering. `public/menu/dawn.webp` is 269,424 bytes, `midnight.webp` is 234,010
bytes and `title.webp` is 89,178 bytes (see the runtime manifest for exact sizes and
hashes). The two requested WebP images total 358,602 bytes. The unused alternative is not requested during ordinary menu boot.
Background and title failures leave readable fallback text and native controls.

`src/app/routes.ts` is the base-aware route classifier and bounded intent builder.
The production preload script applies the same route boundaries before requesting
engine chunks. Menu inspection imports validators/content through `menuSaves.ts`
and a side-effect-free run context, without importing app hosts. It creates no
sessions, RNG or writes and never exposes save bytes in DOM.

Menu actions use full-page navigation to the configured base root. A bare
`?game=dungeon` resumes the saved map or encounter and falls back to the menu
when no run is eligible. Dungeon actions such as `?game=dungeon&entry=new` consume
the `entry` request once and keep `game=dungeon` for reload.
Standalone battle and three-encounter run launch links include `entry=new`,
for example `/prototype/?game=run&entry=new`. Reloading those links starts a
fresh session. Their bare `?game=` URLs open the main menu.
New Game starts immediately when both dungeon save slots are empty. Otherwise it asks for confirmation over the
menu. The dungeon rechecks the reviewed saves before replacement and requests
confirmation again if they changed. If a confirmed replacement clears slots but
cannot publish its new save, existing recovery exports retain reviewed old bytes
and the destination opens recovery with unsaved status. Existing save keys/formats/rules
are unchanged.

Save inspection refreshes on focus, pageshow, storage changes and action. Menu
dialogs are native, support Escape and restore the invoking control's focus.
Settings reuses privacy controls; collection remains off on the menu. Mode return
links preserve pagehide cleanup. Dungeon departures consult explicit save/adoption
state, so rejected input cannot clear an unsaved warning. Terminal and startup
battle dialogs offer a Main menu button inside the modal.

The `main-menu.spec.ts` suite belongs to the default three-profile Chromium matrix
and the existing two-profile iPhone WebKit acceptance stage. Serial batch selection
includes it exactly once per Chromium project. Saved-game browser regressions use
the root selector, including the item fixture's moved durability cases. `/map`
remains inspection. Supported
explicit root `scene` diagnostics take precedence over `game`. The first `scene`
value controls both route resolution and scene startup; later values are ignored.
Unknown or duplicate
`game` values render the menu. Direct paths cannot select a persistent entry through
query parameters. `/battle`, `/run`, `/dungeon`, `/map` and supported explicit
scene diagnostics start fresh without inspecting or changing any saved-game slot
or menu-review handoff. Testing run/dungeon owners have no storage object;
standalone testing battles use `BattleSession` directly. Testing can still play,
restart and travel floors, and resets on reload. Save/recovery and unsaved-departure
controls belong to persistent root play. Audio and privacy preferences keep their
independent behavior.
