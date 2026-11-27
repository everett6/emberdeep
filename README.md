# Emberdeep

A single-file HTML5 canvas metroidvania-lite. Descend an endless series of caverns, fight a mid-level boss and an end boss in each, and spend shards and gold on weapons and charms. Open `index.html` in a browser to play. It needs no build step.

## Features

- Endless levels: maps grow from 260 to 560 blocks wide, with 10 themes and tougher enemies each level (elite crawlers from level 6).
- Two bosses per level, 20 in total. Levels 1-5 each end with one of the newest five:
  - Hollow Mimic replays your own movement as deadly echoes.
  - Void Astronomer opens gravity wells and flings orbiting stars.
  - Petrifying Eye hurts anyone who moves while it is open.
  - Prism Engine sweeps rotating laser spokes.
  - Magma Architect conjures ledges, then floods the floor with lava.
- Temporary upgrades: every chest (and every mid-level boss) grants a blessing that lasts until the level ends.
- Weapons: sword, mace (forge upgrade), daggers, whip, chakram, ember bolt, longbow, soul scythe, shock rod, plus the spear lunge and the Skybreaker.
- A third trader sells four more weapons, each with 4 upgrade stages: Frost Brand, Void Orb, Wisp Lantern and Blast Bombs.
- 5 heroes, time-stop super, parry, hidden tech, achievements and run ranks.
- Modes: solo, 2-player co-op, versus (PVP arenas with hazards), Boss Rush, Daily Run.
- Map: a minimap plus a full-screen map on M that fills in as you explore.
- Gamepad, touch controls, sound and music.
- Online 2-player (co-op or versus) across two devices, through the included relay server (`npm install && npm start`).

## Controls

| Action | Player 1 | Player 2 (same keyboard) |
|---|---|---|
| Move | A / D | Left / Right |
| Jump | W or Space | Up |
| Attack | J | . |
| Spear lunge | K | / |
| Dash | C or Shift | , |
| Skybreaker | L | ; |
| Time-stop super | H | ' |
| Swap weapon | Q | N |
| Loadout and shop | E | Enter |

M opens the map, P pauses and O mutes. Press H on the title screen for the full help page.

## Online play

The host presses L on the title screen, then H, and shares the 4-letter code. The guest presses L, then J, and types it. The host's device runs the game and the guest's device sends its controls and renders what the host reports. Only the host can use the shop and save progress.

## Tests

`node test/run.js` loads the game in a headless sandbox and checks levels, bosses, weapons, upgrades and online sync.
