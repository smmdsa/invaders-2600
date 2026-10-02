# Verification — 2026-10-02

## Follow-up: surviving dive attacks

`npm test`: **64 passed, 0 failed** after changing surviving DIVER and MIRROR attacks to return from above and rejoin their moving formation slots. Fourteen new regression tests cover both types, score/kill accounting, death/contact, lone survivors, slot movement, invasion resets, visible border entry, shooting during return and pause. The new behavior assertions were observed failing before implementation; the complete original fifty-test suite remains green. `node --check js/core.js` passed. See `docs/diver-return-fix.md` for the focused task record.

## Automated evidence

`npm test`: **50 passed, 0 failed** using Node's built-in test runner. No installed packages.

- 33 simulation tests: ten-stage progression, all introduced types and wave counts, unique diamond shape, eight-pixel limits and shrinking bounds, scout/tank movement cooldowns, kamikaze movement/contact, real bullet collisions, shield charges, caps, supply cadence and reward cycle, pickup collision/miss, three non-damaging statuses, actual fire-rate increase, boss phases/vulnerability/summons, invasion recovery, simultaneous defeat/clear ordering, restart and leaderboard validation.
- 9 app integration tests execute the actual app with the real simulation and a small DOM adapter: keyboard controls, pointer controls/cancel, pause, blur, transition pause/resume, victory and defeat score entry, duplicate prevention, invalid initials, blocked storage, dialogs and toggles. Presentation is checked separately in the browser.
- 4 audio tests execute the actual synthesizer with native audio-node adapters: gesture gating, mute/gain, deterministic decaying noise, stopped tones and every gameplay cue.
- 4 sprite tests: seeded deterministic mirrored 8×8 binary sprites, seed/type variation, complete bitmap character set and standard NTSC sprite colors.

The full campaign test kills all eight formations and both bosses through the real projectile collision pipeline, advances the real transitions, and reaches victory with score and hearts intact. Projectiles are placed at collision surfaces in this rules test; this does not claim a human playthrough or measure player skill.

## Browser evidence

Codex in-app Chromium, local server at `http://127.0.0.1:8080`:

- Menu, hand-drawn bitmap title, procedural sprites, animated stars, HUD and guide visually inspected.
- Manual dialog opened, content verified, then closed.
- Start, firing, keyboard pause, resume and pointer-accessible pause exercised.
- Live play reached a wave clear; a live defeat opened the initials form.
- A stored `ASD` leaderboard entry remained visible in a fresh tab, verifying browser persistence.
- 390×844 responsive viewport: touch buttons visible, pause works, no horizontal overflow. Temporary viewport override reset after testing.
- Sound OFF/ON and CRT OFF/ON toggle states verified.
- Fullscreen entered; native Escape returned to the page.
- Fresh final-build browser logs: **no errors or warnings**.
- Final desktop screenshot: `docs/arcade-desktop.jpg`.

## Review and fixes

Independent read-only code review identified unavailable touch pause, controls missing on wider touchscreens, and focus loss during transitions. All fixed. Pause and transition defects have regression tests observed failing before fixes and passing afterward. Coarse-pointer media queries now reveal touch controls independently of viewport width. Fourth wave formation expanded its candidate grid to produce a symmetric diamond; its regression test passed after the change.

Selected sprite accents are exact entries from [Stella's standard Atari 2600 NTSC palette](https://github.com/stella-emu/stella/blob/master/src/common/PaletteHandler.cxx#L557). Page chrome uses additional dark tones; the game does not emulate hardware timing or region-specific CRT output.

No third-party assets, dependencies, production debug shortcuts, or remote requests. JavaScript syntax checks passed for every source and the native HTTP server. This workspace is not a Git repository, so no branch or commit was created.
