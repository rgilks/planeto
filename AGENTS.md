# AGENTS.md

Source-of-truth guide for working on **Planeto**. Read this first. Keep it current — if you change how something works, update the description here in the same commit.

## What this is

Planeto is a browser-based 3D toy: a procedurally generated cluster of drifting planetoids that you orbit with the camera, lightly shared between everyone connected at once. Each browser tab is an anonymous participant rendered to others as a floating "eye"; double-clicking (or a key press) fires a Unicode symbol that everyone else sees fade above your eye. Live at [planeto.fly.dev](https://planeto.fly.dev).

- **Framework:** Next.js 16 (App Router) + React 19, TypeScript (strict).
- **Rendering:** React Three Fiber (`@react-three/fiber`) + Drei, with a Bloom pass (`@react-three/postprocessing`). Procedural textures via `simplex-noise`.
- **Physics:** Rapier (`@react-three/rapier`) rigid bodies, but gravity is **custom** — an N-body loop in `usePhysicsSimulation`, not Rapier's built-in gravity.
- **State:** Zustand (+ the `zustand/middleware/immer` middleware), six small stores.
- **Domain:** Zod schemas; only `EventSchema` validates at runtime (the rest are type sources).
- **Transport:** Server-Sent Events for server→client, HTTP POST for client→server, both at `/api/events`. Shared state is **in-memory in the single server process** — no database, no persistence.
- **PWA:** `next-pwa` (service worker built only on production `next build`, disabled in dev).
- **Deployed:** Fly.io (Docker), single 256 MB machine in `lhr`, scale-to-zero.

Size: ~2k LOC, ~31 source files, 6 Zustand stores, 1 API route.

## Workflow

- Work directly on `main`; commit and push directly (no feature branches or PRs unless asked).
- Check `git status` before editing; preserve unrelated local changes.
- Stage explicit file paths, not `git add -A` / `git add .`.
- For user-visible code changes the standing flow is: commit, push, watch CI, then smoke-test the live site. Docs-only changes just need commit + push.
- Keep commit messages short and imperative.

## Commands

Node >= 22, npm.

```bash
npm run dev          # next dev --turbopack
npm run build        # next build (output: standalone)
npm run start        # serve the production build locally

npm run verify       # prettier --write . && eslint (--max-warnings=0) && tsc --noEmit   (mutates: formats files)
npm run check        # verify + playwright e2e            (full local gate)
npm run test:e2e     # playwright only

npm run deps         # npm-check-updates (report)
npm run nuke         # rm node_modules + lockfile + .next, reinstall
```

**Before committing, run `npm run verify`.** CI (`.github/workflows/fly.yml`) runs `npm run verify` and then deploys to Fly.io on every push to `main` — there is no separate test job, so the e2e suite only runs when you run `npm run check` locally.

## Architecture & code map

**Runtime data flow.** The client renders the planet cluster in an R3F `Canvas` and runs the gravity simulation locally. Multiplayer is a thin presence layer:

- _Outbound — eye position:_ `useEyePositionReporting` beacons the camera position (rounded) to `POST /api/events` as an `eyeUpdate`, only when it changed, or unconditionally every 20 s, via `navigator.sendBeacon`.
- _Outbound — symbol:_ a key press (`SymbolHandler` in `page.tsx`) or Canvas double-click sets `symbolStore.lastInput`; `useInputThrottle` POSTs it as a `symbol` event, throttled to one per 100 ms.
- _Server:_ `route.ts` validates every POST against `EventSchema`. `eyeUpdate` → `setEye` (stored **and** broadcast); `symbol` → broadcast only (never stored). `GET /api/events` opens an SSE stream, registers the writer, and immediately replays all currently-known eyes to the new client.
- _Shared state:_ lives entirely in `sseStore.ts` as module-level singletons — an `eyes` Map and a `subs` Set. A 10 s interval purges eyes idle > 30 s. State is lost on restart and is **not shared across processes** (see Gotchas).
- _Inbound:_ `eventStore` owns one `EventSource`, re-validates each frame, and fans out to listeners: `eyeUpdate` → `eyeStore` (raw) → `eyesStore` (animated) → `Eyes.tsx`; `symbol` → `symbolStore.remoteKeys` → fading text in `Eye.tsx`.

```
src/
  app/
    layout.tsx          # root layout; fonts; metadata (manifest link)
    page.tsx            # "use client" home; SymbolHandler keydown listener; renders <Scene/> + <SymbolDisplay/>
    components/
      Scene.tsx         # top-level R3F Canvas; generates myId = nanoid(6); wires every hook; Physics/Bloom/lights/OrbitControls; onDoubleClick → random symbol + disable gravity 2s
      Planet.tsx        # one planet as a Rapier RigidBody (sun = fixed, others = dynamic ball); material, atmosphere, optional ring, moons; delegates to DarkSun when isDarkSun
      DarkSun.tsx       # central body: pointLight + white core + pulsing translucent atmosphere shell
      Moon.tsx          # a moon on a circular orbit (rAF-animated)
      Eyes.tsx          # renders all remote eyes; defines the eye ShaderMaterial; syncEyes + per-frame animation; each eye lookAt the sun
      Eye.tsx           # one eye sphere + fading <Text> symbol (2 s fade)
      Symbol.tsx        # SymbolDisplay — fixed bottom-right HTML overlay of the LOCAL user's last symbol
    api/events/
      route.ts          # GET = SSE stream (subscribe + replay eyes); POST = validate EventSchema → setEye / broadcast
      sseStore.ts       # in-memory singletons: eyes Map + subs Set; broadcast(); purgeStale() every 10 s
  hooks/
    useEventSource.ts            # ensure eventStore connected; subscribe 'symbol' → symbolStore.setRemoteKey (skips own id)
    useEyes.ts                   # subscribe 'eyeUpdate' → eyeStore.setEye; prune stale; returns [id, Vec3][]
    useEyePositionReporting.ts   # beacon camera position to /api/events on change / every 20 s
    useInputThrottle.ts          # throttled (100 ms) POST of 'symbol' events from symbolStore.lastInput
    usePhysicsSimulation.ts      # rAF O(n²) gravity loop (G = 1); applyImpulse per dynamic body; honors physicsStore.isGravityDisabled
    usePlanetData.ts             # builds the sun + 19 planets once bump maps exist; exports G = 1
    index.ts                     # barrel (the 5 reporting/input hooks; not useEyes)
  stores/                        # Zustand, all wrapped in zustand/middleware/immer
    eventStore.ts                # owns the single EventSource; connect/disconnect; symbol/eye listener registries; validates inbound frames
    eyeStore.ts                  # raw remote eye positions { p, t } per id
    eyesStore.ts                 # animated "managed" eyes: appear/visible/disappear lifecycle, per-eye material, lerp + fade
    physicsStore.ts              # isGravityDisabled flag + disableGravityTemporarily(ms)
    symbolStore.ts               # lastInput (local) + remoteKeys (per id)
    rawEyeDataStore.ts           # EMPTY STUB — leftover from a rename, exports nothing (see Backlog)
  domain/                        # Zod schemas
    event.ts                     # Vec3 / SymbolEvent / EyeUpdate / EventSchema (discriminated union) — the runtime validation gate
    eye.ts                       # EyeState / EyeStatus + scale & fade constants (type source only)
    planet.ts                    # Planet / Moon / AtmosphereLayer (type source only; never .parse()d at runtime)
    symbol.ts                    # SymbolInput + the SYMBOLS glyph list
    index.ts                     # barrel
  lib/utils.ts                   # colour / noise / texture / vector helpers (generateBumpMap, generateColorMap, roundVec3, areVec3sEqual, …)
  types/global.d.ts              # Window augmentation for the dev-only __eventStore / __eyeStore / __symbolStore debug handles
tests/                           # Playwright, Chromium only
  api.spec.ts                    # POST /api/events contract: 400 on bad payloads, 200 on valid symbol/eyeUpdate
  basic.spec.ts                  # two browser contexts; full client→server→client SSE propagation of eyes + symbols
  visual-snapshot.spec.ts        # loads /, asserts a <canvas>, writes screenshots/loaded.png
```

## Conventions

- **TypeScript strict.** Validate anything crossing the network with **Zod** — that means `EventSchema` in `src/domain/event.ts`, which guards both the POST route and every inbound SSE frame. The other schemas exist for their inferred types.
- **Prettier + ESLint flat config** (`eslint.config.mjs`); lint is zero-warnings (`--max-warnings=0`).
- **Single server instance is load-bearing**, not incidental — see Gotchas before changing deploy config or the SSE store.
- **IDs** are `nanoid(6)`, generated client-side in `Scene.tsx`.
- Keep components small and single-purpose; match the existing split (one body type per component) rather than growing `Scene.tsx`.

## Deployment

- Fly.io via `Dockerfile` + `fly.toml`: app `planeto`, region `lhr`, one shared-CPU 256 MB machine, `auto_stop_machines = 'stop'` / `min_machines_running = 0` (scale-to-zero), **`max_machines_running = 1`**.
- Push to `main` triggers `.github/workflows/fly.yml`: `npm ci` → `npm run verify` → `flyctl deploy --remote-only`. `FLY_API_TOKEN` is the only required secret.
- See [docs/deployment-flyio.md](docs/deployment-flyio.md).

## Gotchas

- **All multiplayer state is in-process** singletons in `sseStore.ts`. This works _only_ because `fly.toml` caps `max_machines_running = 1`. Adding instances (or horizontal scale) would silently split and drop eyes/symbols; a scale-to-zero cold start wipes them. Any move to multi-instance needs an external broadcast/state layer first.
- **PWA only engages on a production build.** `next-pwa` is wired in `next.config.ts` but disabled in dev, so don't expect a service worker under `npm run dev`.
- **The e2e tests depend on dev-only globals** (`window.__eventStore` / `__eyeStore` / `__symbolStore`), which `eventStore`/`eyeStore`/`symbolStore` expose only outside production. They do not exist on the deployed site.
- **`nanoid` is used but not a declared dependency** — it resolves transitively today (see Backlog). Don't assume it's pinned.
- Gravity is hand-rolled: `<Physics gravity={[0,0,0]}>` integrates bodies, and `usePhysicsSimulation` applies the forces. Changing one without the other will look wrong.

## Backlog

Useful cleanups, none urgent (the app builds, deploys green, and runs):

- **De-duplicate `SYMBOLS`** in `src/domain/symbol.ts` — the two concatenated glyph ranges overlap, biasing random selection.
- **Quiet the logging** in `eventStore.ts` and `api/events/route.ts` (logs on every connect/disconnect/frame; noisy with several tabs open).
- **No unit tests / no `npm run test`** — sibling repos run Vitest. `lib/utils.ts` and the domain schemas are the obvious first targets. The Playwright suite is also Chromium-only (Firefox/WebKit are commented out in `playwright.config.ts`).

## Docs

Docs describe the current state in the present tense; keep history in git, not in docs. The `docs/` folder:

- [technical-overview.md](docs/technical-overview.md) — high-level architecture summary.
- [realtime-communication.md](docs/realtime-communication.md) — SSE design and bandwidth/cost optimisation.
- [sse-store.md](docs/sse-store.md) — the server-side in-memory store.
- [remote-eyes-component.md](docs/remote-eyes-component.md) — how `Eyes.tsx` visualises other users.
- [camera-setup.md](docs/camera-setup.md) — Canvas camera and OrbitControls.
- [api.md](docs/api.md) — the `/api/events` endpoint.
- [e2e-testing.md](docs/e2e-testing.md) — the Playwright suite.
- [deployment-flyio.md](docs/deployment-flyio.md) — deploying to Fly.io.
