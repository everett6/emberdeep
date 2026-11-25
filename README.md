# Emberdeep

A single-file HTML5 canvas metroidvania-lite. Descend an endless series of caverns, fight a boss at the bottom of each, and spend shards and gold on weapons and charms. Open `index.html` in a browser to play. It needs no build step.

## Features

- Endless levels: maps grow from 200 to 460 blocks wide, with 10 themes and tougher enemies each level (elite crawlers from level 6).
- 10 bosses: Cinder Moth, Quarry Colossus, Spore Matron, Glass Stalker, Gale Harpy, Deep Wyrm, Iron Warden, Storm Archon, Pale Reaper, Hive Queen.
- Weapons: sword, mace (forge upgrade), daggers, whip, chakram, ember bolt, longbow, soul scythe, shock rod, plus the spear lunge and the Skybreaker.
- 5 heroes, time-stop super, parry, hidden tech, achievements and run ranks.
- Modes: solo, 2-player co-op, versus (PVP arenas with hazards), Boss Rush, Daily Run.
- Map: a minimap plus a full-screen map on M that fills in as you explore.
- Gamepad, touch controls, sound and music.
- Online 2-player (co-op or versus) across two devices. This only works inside the shared Claude artifact, which provides the realtime room.

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
