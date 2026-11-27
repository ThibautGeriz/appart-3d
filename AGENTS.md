# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Goal

A web app that renders the user's future apartment in 3D and lets them walk
through it like in a first-person video game. It must work equally well on
desktop (keyboard + mouse) and mobile (touch).

Think "apartment walkthrough simulator", not "architectural viewer": the
core experience is moving around inside the home.

## Tech Stack (do not change without asking)

- **Three.js** for 3D rendering (raw `three`, no heavy wrappers)
- **TypeScript**, strict mode
- **Vite** for dev server and builds
- **Vanilla DOM/UI** — no React/Vue; the UI is a thin HUD layer over the canvas
- Apartment geometry defined in **data files (JSON or TS modules)**, never
  hardcoded in render logic, so the layout can be edited independently

## Architecture

```
src/
  main.ts          # bootstrap: renderer, scene, camera, loop
  apartment/       # load apartment data, build meshes (walls, floors, doors, furniture)
  player/          # first-person controller: walking, collision, camera
  controls/        # input: keyboard+mouse (desktop), touch (mobile)
  ui/              # HUD overlays (joysticks, buttons, help)
  data/            # apartment layout: rooms, walls, openings, furniture
  models/          # detailed model sources (toilet, shower, mannequin…), export only
models/            # exported *.glb, loaded by the app (committed, checked in CI)
scripts/           # export-glb.ts: src/models → models/*.glb
```

Key rules:

- **Rendering is data-driven**: `src/apartment/` reads layout data from
  `src/data/` and produces meshes. Adding/moving a wall should be a data
  edit, not a code edit.
- **Player physics is decoupled from input**: the controller exposes
  "move forward/back/strafe, look yaw/pitch, zoom"; the input layer only
  produces those intents. This keeps desktop and mobile identical.
- **Collision**: use simple AABB/box colliders derived from the wall data
  (no full physics engine unless the need is proven). The player is a
  vertical capsule/cylinder; sliding along walls must work smoothly.
- Eye height ~1.6m; realistic scale (rooms in meters).
- **Detailed models are GLBs**: a furniture item with `model: "…"` gets
  `models/<file>.glb` (see `src/apartment/modelFiles.ts`), loaded
  asynchronously into a slot at its footprint. The sources live in
  `src/models/` (PBR materials, origin on the floor, front facing +z,
  built at the footprint size from the layout data). After changing a
  model or its footprint, run `npm run export:glb` and commit the GLBs:
  CI fails if they are stale or invalid. Export with Node 24 (float output
  differs between Node majors).
- **Baked lighting**: the fixed architecture (walls, floors, ceilings,
  built-in furniture) has a lightmap: sky light through the windows with two
  bounces, baked by `npm run bake:lightmap` (CPU path tracer,
  `src/lighting/bake.ts`; layout and lightmap UVs in
  `src/lighting/lightmap.ts`, shared by the app and the baker). After
  changing walls, areas or built-in furniture, re-bake and commit
  `src/assets/lightmap/`: a test fails on a stale bake (layout signature),
  and the app falls back to the flat ambient. The sun stays live.
- **Reflection probes** (`src/lighting/probes.ts`): one cube capture per
  room, box-projected; furniture and floors reflect their room and take
  their indirect light from it. Captured again after furniture, time or lamp
  changes.
- **Set dressing** (`src/apartment/dressing.ts`): skirting boards, door
  frames, sills, switches by the doors, curtains — derived from the walls;
  sockets from `outlets` in the data. Decor (books, lamps, cushions, rugs,
  plant) is named `decor` in the models and not part of the budget.
- **Furniture comes from a catalog**: `src/data/catalog.ts` lists real
  products (seller's dimensions and price). Each one has a builder in
  `src/models/furniture/` and ships as `models/<id>.glb`; a unit test checks
  every model's bounding box against the catalog size. Where they go is data
  (`furnishing` in `src/data/apartment.ts`, layout in
  `src/apartment/furnishing.ts`); the 🪑 toolbar switches products, swaps
  their colliders and shows the budget by room.

## Input Requirements (core feature — treat as spec)

Desktop:

- **WASD / ZQSD-aware**: detect keyboard layout so French AZERTY keyboards
  work natively (prefer `event.code` `KeyW/KeyA/...` over `key` characters).
- **World of Warcraft controls**, cursor always visible (no pointer lock):
  - W/S forward/back, A/D turn, Q/E strafe (ZQSD + A/E on AZERTY), arrows
    like W/S/A/D.
  - Left drag = look around; right drag = turn (mouselook: A/D strafe while
    held); both buttons = walk forward.
  - Click (left or right, no drag) on the floor = click-to-move: walk there
    along a path around walls (A* on a walkable grid). Movement keys or ESC
    cancel it.
- Mouse wheel = zoom out to a third-person view (camera behind an avatar,
  pulled in by walls / ceilings) and back to first person; in third person
  left drag orbits the camera, right drag turns the player.
- No running (single walking speed). Space handled later (jump is optional;
  do not block on it).

Mobile (touch):

- **Small fixed joystick** (bottom-left) = move, **swipe** anywhere else =
  move the camera, **tap** anywhere else = click-to-move.
- Must work with the canvas fullscreened; handle `visualViewport` and
  `100dvh` correctly (not `100vh`).
- Pointer events (`pointerdown/move/up`) uniformly; never assume mouse-only.

## Performance Budget (mobile is the target device, not an afterthought)

- Target 60fps on a mid-range phone; hard floor 30fps.
- Desktop default: antialiasing on; mobile: off (detect via touch/coarse pointer + device memory).
- Reuse geometries and materials; merge static apartment meshes.
- Use `MeshStandardMaterial` sparingly on mobile; simple lambert-style
  materials are fine.
- One directional light + one ambient/hemisphere light max. No real-time
  shadows on mobile.
- Textures are KTX2 / Basis Universal (`npm run encode:ktx2`, committed): they
  stay compressed in video memory, so the scans can be 2K. Photo scans are never
  loaded as JPEG at runtime (new scan: add it to `scripts/encode-ktx2.ts`).
- Rooms out of sight are not drawn, and their models load the first time they
  can be seen (`src/apartment/rooms.ts`); copies of a model in a room are one
  instanced draw (`src/apartment/instancing.ts`).
- Desktop ambient occlusion runs at half resolution (`AO_SCALE`): at full size
  it took ~90 % of the frame.

## Commands

```bash
npm install
npm run dev        # Vite dev server (test on a real phone via LAN URL)
npm run build      # production build
npm run preview    # serve the build
npm test           # unit tests (Vitest) — must pass before any commit
npm run test:perf  # frame rate in a real Chromium, desktop + phone (CI comments it on the PR)
npm run encode:ktx2  # rebuild the KTX2 textures from src/assets/textures/*.jpg
npm run export:glb   # rebuild models/*.glb from src/models
npm run validate:glb # Khronos glTF validator on every model (as in CI)
```

## Conventions

- TypeScript strict; no `any` unless unavoidable (and comment why).
- Keep `main.ts` under ~100 lines; the game loop calls into modules.
- No server component: the app is fully static after build (can be hosted
  on GitHub Pages). Apartment data ships with the app.
- French labels in the UI are acceptable (user is French); code identifiers
  in English.

## Testing Expectations

- Unit-test pure logic: layout parsing, collider generation, input mapping
  (code→intent), player movement math.
- Manual test checklist before considering a feature done:
  - desktop: WASD + AZERTY, A/D turn, Q/E strafe, left/right drag, both
    buttons forward, click-to-move (through doors), wheel zoom
  - mobile: joystick, swipe to look, tap to move, no scroll/zoom hijack, correct fullscreen height,
    playable framerate
  - collision: cannot walk through walls; smooth sliding in corridors
