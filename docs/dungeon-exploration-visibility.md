# Dungeon exploration visibility

Dungeon exploration uses a Manhattan radius of two cells. The player's cell and each
in-bounds adjacent cardinal cell are visible, including the face of a wall. A wall
blocks the cell directly behind it. A diagonal cell is visible if either adjoining
cardinal cell is open. Two adjoining walls close the corner. The dungeon domain
computes this bounded rule from floor geometry and the committed player position.
The general-purpose rot.js PreciseShadowcasting algorithm casts angular shadows
over successive rings. The two-cell rules fit a small pure function and require no
dependency or adapter. Combat targeting and enemy movement keep their own rules.

The current floor shows blank unexplored cells, hatched remembered terrain, and
unhatched terrain in current sight. Discovered stairs and cleared encounters persist
in memory, subject to the existing stair availability and marker priority rules.
Live encounter markers and their accessible descriptions use current sight. The
map does not keep last-seen enemy locations.

Save envelopes retain their existing format and content identity. The floor's
optional `sightVersion: "wall-sight-v1"` explicitly identifies the wall-aware discovery
rule in both fixed and movable encounter records. Existing floor records without
this field use the original admission checks and keep every revealed and visited
cell. Their first accepted step adds the field and accumulates only the new
position's sight. New floors start with the field and wall-aware memory. This is
forward compatibility for existing saves. Older clients reject the new floor field.

Current sight is derived on display and is never stored. Floor transitions and
battle returns use the committed floor and position. Art loading and style changes
only repaint known terrain. Rejected commands leave both discovery and RNG unchanged.
