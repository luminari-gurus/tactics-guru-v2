# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dungeon-extended.spec.ts >> Mage legal progression journey earns level three uses Frost Snare and multiple missiles and resumes
- Location: tests/dungeon-extended.spec.ts:16:1

# Error details

```
Test timeout of 600000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=f2e2]:
  - generic [ref=f2e3]:
    - heading "Dungeon defeat · Forest · Floor 2" [active] [level=1] [ref=f2e4]
    - paragraph [ref=f2e5]: Walk onto any uncleared enemy to start its encounter. Clear all three encounters to unlock the stairs.
    - status [ref=f2e6]: Dungeon saved on this device
  - region "Floor exploration" [ref=f2e7]:
    - heading "Explore Forest · Floor 2" [level=2] [ref=f2e8]
    - generic [ref=f2e9]:
      - text: Map art
      - combobox "Map art" [ref=f2e10]:
        - option "Simple" [selected]
        - option "Legacy 8-bit"
    - paragraph [ref=f2e11]: ● Player · M encounter (including guardian) · ✓ cleared · ↑ upstairs (floor 2+) · ↓ downstairs (all encounters cleared). Enemies move when you move. Tap adjacent cells or use direction controls.
    - application "Floor 2 map. Player row 14, column 8. Arrow or WASD keys move one cell." [ref=f2e12]:
      - generic [aria-hidden] [ref=f2e70]: ↑
      - generic [aria-hidden] [ref=f2e309]: ✓
      - generic [aria-hidden] [ref=f2e332]: ●
    - group "Move player" [ref=f2e589]:
      - button "North" [disabled] [ref=f2e590]:
        - generic: "N"
      - button "East" [disabled] [ref=f2e591]:
        - generic: E
      - button "South" [disabled] [ref=f2e592]:
        - generic: S
      - button "West" [disabled] [ref=f2e593]:
        - generic: W
    - status [ref=f2e594]: Player cell 319 · Revealed 81/576 · Visited 16.
  - generic [ref=f2e595]:
    - region "Stairs" [ref=f2e596]:
      - heading "Stairs" [level=2] [ref=f2e597]
      - paragraph [ref=f2e598]: Move onto an available stair to travel automatically. On arrival or after continuing a save, move off and back onto the stair to travel again. Upstairs is unavailable on floor 1.
      - paragraph [ref=f2e599]: Clear all three encounters and claim pending rewards to unlock descent.
    - region "Party" [ref=f2e600]:
      - heading "Party" [level=2] [ref=f2e601]
      - paragraph [ref=f2e602]: "fighter: 0/30 HP · Level 3 · XP 230/360 · Learned: basic attack, guarded strike, second wind, taunt · Accuracy 4 · Armor class 14 · Defeated"
      - paragraph [ref=f2e603]: "ranger: 0/22 HP · Level 3 · XP 230/360 · Learned: basic attack, high shot, mark target, pinning shot · Accuracy 5 · Armor class 12 · Defeated"
      - paragraph [ref=f2e604]: "mage: 0/19 HP · Level 3 · XP 230/360 · Learned: basic attack, frost snare, magic missile · Accuracy 3 · Armor class 11 · Defeated"
    - region "Owned items" [ref=f2e605]:
      - heading "Owned items" [level=2] [ref=f2e606]
      - paragraph [ref=f2e607]: Charms 1/6 · Discard a charm with confirmation to free space.
      - generic [ref=f2e608]:
        - paragraph [ref=f2e609]: Aiming Charm
        - combobox "Aiming Charm target" [ref=f2e610]:
          - option "fighter (defeated)" [disabled]
          - option "ranger (defeated)" [disabled]
          - option "mage (defeated)" [disabled]
        - button "Unequip Aiming Charm" [disabled] [ref=f2e611]
        - button "Discard Aiming Charm" [disabled] [ref=f2e612]
    - button "Save recovery" [ref=f2e613] [cursor=pointer]
    - button "Start new dungeon" [ref=f2e614] [cursor=pointer]
    - navigation [ref=f2e615]:
      - link "Three-battle scenario" [ref=f2e616] [cursor=pointer]:
        - /url: /run
      - link "Single battle" [ref=f2e617] [cursor=pointer]:
        - /url: /battle
      - link "Map prototype" [ref=f2e618] [cursor=pointer]:
        - /url: /map
  - link "Main menu" [ref=f2e619] [cursor=pointer]:
    - /url: /
  - group [ref=f2e620]:
    - generic "Privacy & analytics" [ref=f2e621] [cursor=pointer]
```