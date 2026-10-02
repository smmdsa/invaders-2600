# INVADERS / 2600

A complete Atari-inspired arcade campaign made with HTML, vanilla JavaScript, CSS, Canvas 2D and Web Audio. No third-party packages, fonts, images, SDKs or build step.

## Play

Open `index.html` directly, or run `npm start` and visit http://127.0.0.1:8080.

- A/D or left/right arrows: move. Hold Space: fire.
- Enter: start. P or Escape: pause/resume. M: mute.
- Touch controls appear on narrow screens. Fullscreen and optional CRT scanlines are below the game.
- Leaving the tab automatically pauses the game.

## Campaign

Two worlds, each containing four unique formations and a boss. Scouts fire after four formation movement steps, tanks after five. Eliminating edge columns expands the group's travel. Divers leave formation. Surviving dive attacks loop from the bottom to the top and fly back into their original slot relative to the moving block; DIVER and MIRROR both follow this rule. Defeated enemies and those lost on player contact stay gone. Frost, Jammer and Mirror attacks freeze, silence or invert controls without removing hearts. Status timers appear below the ship.

Boss warnings show the next pattern. Dodge fan and aimed volleys, then attack the exposed core. Both bosses summon enemies; clear those too. Formation breaches cost a heart and push the invaders back. Damage grants 1.25 seconds of invulnerability.

Every ten kills calls a fast supply ship above the formation. Destroy it and catch its falling pickup. Supplies cycle through life (+), shield (S), weapon (W), fire rate (F). Hearts and upgrades cap at five; shields absorb five damaging hits. Upgrades persist across stages.

Victory and defeat both offer classic three-letter score entry. The best eight scores are stored locally; the sidebar displays five. Browser storage failures never prevent gameplay.

## Verify

Run `npm test` (Node 18+). Tests use Node's built-in runner and the same engine/sprite files the browser loads. No installation needed.

`js/core.js` owns the deterministic simulation and leaderboard validation. `js/sprites.js` defines a native 5×7 font and seed-driven mirrored 8×8 monochrome sprites. `js/renderer.js` draws the game and effects. `js/audio.js` synthesizes event-based sounds. `js/app.js` handles fixed-step timing, keyboard/touch input and page flows.

Sprite colors use a limited subset of [Stella's standard Atari 2600 NTSC palette](https://github.com/stella-emu/stella/blob/master/src/common/PaletteHandler.cxx#L557): orange E39759, green B4E775, gold E8CC63, cyan 75CCEB, pink EC8CE0 and violet A980F0. The page frame uses additional dark tones. This is an aesthetic recreation, not a hardware emulator. All sounds are generated at runtime and begin after user interaction.
