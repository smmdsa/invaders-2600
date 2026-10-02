# Missed dive return behavior

## Requested change

Any enemy that leaves formation and survives a missed attack must loop from below the viewport to above it, then descend back into its original formation slot. Applies to DIVER (B), MIRROR (F), and the shared dive mechanism.

## Completed work

- [x] Reproduce the old deletion behavior with regression tests.
- [x] Preserve the formation slot while the enemy is away, including block movement, boundary descent and invasion resets.
- [x] Replace offscreen deletion with a visible top-entry return phase.
- [x] Rejoin at the current slot, restore room for edge columns, and restart the normal attack cooldown.
- [x] Keep returning enemies alive and counted toward stage completion. Do not award kills, score or supplies for missed dives.
- [x] Preserve death on player contact and projectile damage, including shots during the return flight.
- [x] Verify pause behavior and the last remaining enemy returning without a stationary block.
- [x] Run the complete suite: 64 passing tests; core JavaScript syntax valid.

Files: `js/core.js`, `tests/diver-return.test.cjs`. Native canvas rendering already draws alive enemies in every movement mode, so no rendering or input changes were needed.
