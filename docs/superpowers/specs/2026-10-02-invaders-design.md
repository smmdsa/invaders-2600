# INVADERS / 2600

Build a complete browser arcade game from the user's supplied specification. Native HTML, CSS, JavaScript, Canvas 2D and Web Audio only; no dependencies, external fonts, assets, or network requests. This folder is empty and is not a Git repository. Execute in this workspace.

## Presentation
An Atari-inspired black starfield, warm orange, pale gold, mint, cyan, rose and violet palette. Sprite accents use exact values selected from Stella's standard NTSC palette; the page frame uses additional dark tones. Integer 8×8 sprites use seeded pseudorandom half-grid generation and horizontal reflection, with deterministic silhouettes for readability. A hand-defined 5×7 bitmap font draws arcade copy. The responsive page frames the canvas with a high-score board and enemy field guide. Optional scanlines, mute, pause and fullscreen. Reduced-motion preference reduces decoration.

## Game rules
480×500 logical viewport; 8 pixel horizontal border. Player starts with three of five hearts, one weapon and fire-rate tier one. A/D or arrow keys move; Space fires; Enter starts; P/Escape pause. Touch controls also work. Fixed 60Hz simulation, with held input and no background-tab catch-up.

Two worlds with four increasing waves then a boss each (ten stages). World one introduces scout A, kamikaze B, tank C and freeze D. World two adds silence E then inversion F before mixing all types. Each wave has a unique deterministic shape and increasing enemy count. Tanks occupy the front of their columns. Living formation members determine horizontal bounds; eliminating edge columns allows the entire group to travel farther. Each movement advances eight pixels; scouts fire after four movement steps, tanks after five. Attacking columns are rate-limited for a fair early game. Kamikazes detach and follow an erratic, dodgeable trajectory. Freeze, silence and inversion attacks apply temporary visible timers without removing hearts. Shield absorbs five damaging hits; contact and damage have invulnerability windows. Enemy invasion costs a heart and restores formation altitude rather than ending the whole run immediately.

Bosses telegraph fan volleys, aimed volleys and enemy summons; attack windows alternate with vulnerable recovery windows. Both bosses can spawn minions; defeat requires clearing boss and minions. Boss two adds denser radial patterns. Attacks remain dodgeable with horizontal-only movement, visible telegraphing and projectile speed limits.

Every ten player kills schedules a fast supply craft behind the formation. Shooting the craft drops a collectible: heart (cap five), shield (five charges), weapon tier (cap five), or fire-rate tier (cap five). Queued supply craft spawn sequentially. Drops fall and require contact. Progress and upgrades persist between stages; transition clears hazards and animates the ship flying forward. Clearing the final boss and minions wins; zero hearts loses.

## Persistence and audio
Both outcomes open a three-letter uppercase initials form. A top-eight leaderboard persists in localStorage, validates stored data, handles blocked storage gracefully and prevents duplicate submission. Web Audio starts only after user interaction, synthesizing fire, movement beats, hits, effects, upgrades, transitions and boss cues. Sound and effects respond to actual game events; pause silences scheduling.

## Verification
Node's native test runner exercises movement, firing, damage, all six enemies, formation bounds, supply cadence, caps, pickup contact, status expiry, boss phases/summons, all ten transitions, win/loss, deterministic sprites, initials, leaderboard sorting and broken storage. A native HTTP server serves local files for browser QA. Browser verification covers startup, keyboard gameplay, pause/resume, menu/guide/leaderboard, sound/fullscreen controls, responsive layout, victory/defeat initials and saved scores. No production debug shortcuts.
