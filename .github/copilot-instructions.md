# Copilot instructions

## Project overview

This is a dependency-free browser game called **NEON RUNNER**. It is served as static files and runs entirely in the browser:

- `index.html` is the page shell. It defines the HUD, game canvas, end-state message, restart button, and mobile controls, and loads the stylesheet and script.
- `style.css` owns the neon visual system, layout, responsive breakpoint, and mobile control visibility. The existing UI is bilingual/multilingual in practice: most labels are English while gameplay messages and controls use Japanese.
- `script.js` is the game engine. It queries the DOM once, maintains all mutable game state, updates entities in a `requestAnimationFrame` loop, draws the world with the 2D canvas API, and updates the HUD.

The game world uses world coordinates that are separate from the canvas viewport. `world.ground` is recalculated from the rendered canvas height; platforms, collectibles, enemies, the player, and the exit are positioned relative to it. `cameraX` scrolls the translated drawing context while the player progresses through the fixed `world.width`.

## Commands

There is no package manager, build step, test runner, or linter configured in this repository.

Run the game locally from the repository root with a static server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/> in a browser. There are no automated tests or single-test command; manually exercise keyboard input, mobile pointer controls, restart, win, loss, resize, and HUD updates when changing gameplay or UI behavior.

## Implementation conventions

- Keep gameplay state in the module-level variables already used by `script.js` (`player`, `platforms`, `collectibles`, `enemies`, `gameState`, and so on). `resetGame()` is the single place that reconstructs a new run and should reset every run-specific value.
- Use the existing frame model: `update(dt)` advances state using the capped, seconds-based delta from `loop()`, while `draw()` renders the current state. Convert to frame-like values only where the current physics constants already do so (`dt * 60`).
- Add new world objects to the arrays initialized in `resetGame()`, and use world coordinates rather than viewport coordinates. Account for `world.ground` when placing objects vertically.
- Preserve the input abstraction: keyboard and mobile controls add names to the shared `keys` set, and movement reads that set through `isDown()`. Actions such as jump and attack should remain gated by `gameState === 'playing'`.
- Keep DOM updates centralized in `updateHud()`. Use `finish(won)` for terminal states so the overlay and restart behavior remain consistent.
- Display user-facing explanations, gameplay messages, and other descriptive text in Japanese. Keep established English product labels and HUD terminology unchanged unless the surrounding UI is being intentionally localized.
- When adding canvas visuals, draw in world space inside the existing camera translation. Use the established palette variables in CSS (`--cyan`, `--yellow`, `--purple`, etc.) as the source of truth for UI colors; canvas colors currently mirror those values as literals.
- Preserve the existing responsive contract: desktop uses keyboard instructions, while the mobile breakpoint reveals `.mobile-controls` and hides the footer instructions. Any new control must have an accessible label and work with pointer cancellation/release.
- Keep the HTML/CSS/JavaScript dependency-free unless the repository is deliberately changed to introduce a build system. If external assets are added, update the static-serving assumptions and document the new workflow here.
