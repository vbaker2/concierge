# Aleks' Lucky 8's · Arcade Edition

Widescreen (16:9) edition for the arcade cabinet: 6 reels × 4 rows, 4,096 ways,
expanding 福 wilds, free-spin multiplier ladder, Hold & Spin, Dragon Wheel and
the Cash Pot / Jackpot Pick. Output: `../static/arcade.html` (self-contained).

| File | What it is |
|---|---|
| `gm.js` | Game maths: symbols, strips, pays, features, all tuning in `GM.T`. No DOM. |
| `sim.js` | Headless RTP simulator using `gm.js`: `node sim.js 1000000 88` |
| `shared.js` | Code shared with the original game (sound, symbol art, effects, pot, topper bulbs, gamepad) |
| `arcade.template.html` | Layout, styles and game flow; `build.py` fills in the markers |
| `build.py` | `python3 fruit_machine/arcade/build.py` writes `static/arcade.html` |

Art, sounds and fonts are copied from the `window.__ART / __SND / __FONT` blocks in
`static/index.html` at build time, so re-embed assets there and rebuild.

## Tuning

Change numbers in `gm.js` (`GM.T`, strip weights in `SYMS`, `WHEEL` weights), then
check with the simulator and rebuild. Overrides can be tried without editing:

    node sim.js 300000 88 '{"T":{"PAY_SCALE":0.1},"W":{"lantern":1}}'

Reel strips are fixed (seeded), so the game and the simulator see the same reels.
Simulated 2026-10-11, 1M spins: **~77% RTP** at both bet 8 and bet 88 —
base 43%, free spins 14% (1 in ~240), Hold & Spin 8% (1 in ~440),
Dragon Wheel 6% (1 in ~490), Cash Pot 5.5% (1 in ~70 at bet 88, ~11× rarer at bet 8).

## Features

- **Expanding wild** — a 福 on reels 2–5 expands to fill its reel (30% chance).
- **Free spins** — 3/4/5+ lanterns → 8/10/15 spins on loaded strips; every expansion
  steps the ladder ×1 → ×2 → ×3 → ×5 → ×8 → ×10 for the rest of the feature.
- **Hold & Spin** — 6+ gold coins lock with cash values (or MINI/MINOR), 3 respins,
  new coins reset to 3; all 24 positions = GRAND.
- **Dragon Wheel** — 3+ taiko drums on consecutive reels from the left: cash, free
  spins, Hold & Spin or a jackpot.
- **Cash Pot** — coins (when fewer than 6) fill the pot at wager/88 per coin; full pot
  plays the Jackpot Pick. Jackpots are fixed (GRAND 7,040 · MAJOR 1,408 · MINOR 352 · MINI 88).

On the cabinet it is `~/fruitmachine/arcade.html`, listed in Attract's
"Fruit Machine" display (romlist `~/.attract/romlists/Fruit Machine.txt`).
