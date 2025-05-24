# Planeto

[![CI/CD](https://github.com/rgilks/planeto/actions/workflows/fly.yml/badge.svg)](https://github.com/rgilks/planeto/actions/workflows/fly.yml)

![planeto Screenshot](/screenshots/loaded.png)

<div align="center">
  <a href='https://ko-fi.com/N4N31DPNUS' target='_blank'><img height='36' style='border:0px;height:36px;margin-bottom: 20px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

> In the void, a cluster of planetoids drifts. Disembodied eyes hover, exchanging cryptic emerald glyphs. No sun, no orbit, only the silent gaze and the endless, shifting dance of matter and symbol.

## Features

- Esoteric planetoid cluster, ever-evolving
- Disembodied eyes, each a silent watcher
- Glyphic communication: green symbols flicker between entities
- Procedural textures and shifting forms
- Arcane controls: zoom, rotate, peer deeper
- Multiplayer: your glyphs are seen by other eyes, and theirs by you
- Immutable domain, defined by Zod
- **Efficient presence:** Eye sends a lightweight ping if it hasn't moved, so your eye remains visible without unnecessary data

## The Dance of Matter

- All bodies drift, collide, and influence each other in the void
- Gravity is a hidden hand, unseen but ever-present
- Collisions are rare, but when they occur, the cluster shudders

## The Stack of Rituals

- Next.js (App Router, TypeScript)
- React Three Fiber (@react-three/fiber)
- Drei (@react-three/drei)
- Rapier physics (@react-three/rapier)
- Zod (domain model)
- Zustand (state management)

## To Enter the World

```sh
npm install
npm run dev
```

Open your portal: [http://localhost:3000](http://localhost:3000)

## The Structure of the Void

Behold the lattice of the void, where every glyph and watcher finds its place:

```mermaid
flowchart LR
    subgraph PlanetoProject [planeto/]
        direction LR
        subgraph SrcDir [src/]
            direction TB
            subgraph AppDir [app/]
                direction TB
                AppPage[page.tsx] --> SceneComp
                Layout[layout.tsx]

                subgraph ApiDir [api/]
                    direction TB
                    EventsApi[events/route.ts] --> ServerLogic[/sseStore.ts/]
                end

                subgraph ComponentsDir [components/]
                    direction TB
                    SceneComp[Scene.tsx] --> CanvasContent
                    CanvasContent --> EyesComp
                    CanvasContent --> PlanetComp
                    CanvasContent --> OrbitControls
                    EyesComp[Eyes.tsx]
                    SymbolDisplayComp[SymbolDisplay.tsx]
                    PlanetComp[Planet.tsx]
                end
            end

            subgraph DomainDir [domain/]
                direction TB
                DomainIndex[index.ts \n(Zod Schemas, SYMBOLS)]
            end

            subgraph HooksDir [hooks/]
                direction TB
                EventSourceHook[useEventSource.ts]
                InputThrottleHook[useInputThrottle.ts]
                PhysicsSimHook[usePhysicsSimulation.ts]
                PlanetDataHook[usePlanetData.ts]
                EyeReportHook[useEyePositionReporting.ts]
                EyesHook[useEyes.ts]
            end

            subgraph StoresDir [stores/]
                direction TB
                EventStore[eventStore.ts]
                EyeStore[eyeStore.ts]
                EyesVisualStore[eyesStore.ts \n(Visual Animation State)]
                SymbolStore[symbolStore.ts]
            end

            subgraph LibDir [lib/]
                direction TB
                Utils[utils.ts \n(e.g., generateBumpMap)]
            end
        end

        Readme[README.md]
        PackageJson[package.json]
        NextConfig[next.config.ts]
        Dockerfile[Dockerfile]
        FlyToml[fly.toml]
        TsConfig[tsconfig.json]

        subgraph DocsDir [docs/]
            direction TB
            TechOverview[technical-overview.md]
            RealtimeComm[realtime-communication.md]
            ApiDoc[api.md]
            DeploymentDoc[deployment-flyio.md]
            EyesDoc[remote-eyes-component.md]
            CameraDoc[camera-setup.md]
            E2EDoc[e2e-testing.md]
            SSEServerDoc[sse-store.md]
        end
    end

    %% Relationships
    SceneComp --> PlanetDataHook
    SceneComp --> PhysicsSimHook
    SceneComp --> InputThrottleHook
    SceneComp --> EventSourceHook
    SceneComp --> SymbolStore
    CanvasContent --> EyeReportHook
    EyesComp --> EyesHook
    EyesComp --> SymbolStore
    EyesComp --> EyesVisualStore
    EyesHook --> EventStore
    EyesHook --> EyeStore
    EventSourceHook --> EventStore
    EventSourceHook --> SymbolStore %% For incoming remote symbols
    EventSourceHook --> EyeStore %% For incoming remote eye updates
    EventsApi --> DomainIndex
    SymbolStore --> DomainIndex
    PlanetDataHook --> Utils
    EyeReportHook --> EventsApi
    %% Symbol trigger/display flow
    SceneComp -.-> SymbolStore %% onDblClick updates lastInput
    SymbolDisplayComp -.-> SymbolStore %% reads lastInput
    InputThrottleHook -.-> EventsApi %% sends throttled symbol event

    %% Data flow for remote eyes visual
    EventsApi -- EyeUpdateEvent --> EventSourceHook
    EventSourceHook -- EyeUpdateEvent --> EyeStore
    EyesHook -- reads --> EyeStore
    EyesComp -- uses data from --> EyesHook
    EyesComp -- uses visual state from --> EyesVisualStore
    EyesVisualStore -- syncs with data from --> EyesHook
```

_The void is deep. The structure is ever-shifting, but this is its current form._

## Ritual Scripts

- `npm run dev`: Open the portal
- `npm run build`: Prepare the world for others
- `npm run start`: Begin the ritual in production
- `npm run lint`: Seek out impurities
- `npm run check`: All-seeing check: format, lint, type, and test

## Extending the Mystery

- To birth new planetoids, alter the genesis logic in `src/hooks/usePlanetData.ts`.
- To change the glyphs, edit the `SYMBOLS` array in `src/domain/index.ts` (or the file where `SYMBOLS` is defined within `src/domain/`).

## License

MIT (for those who care for such things)

## Notes from the Void

- The gaze is fixed. There is no sun. There is no center. Only the cluster and the eyes.

## Glyphic Exchange

When a watcher double-clicks, a vast green glyph (from an alien alphabet) appears in the bottom-right of their screen. This glyph is not the key, but a symbol mapped from a randomly chosen one. Only the glyphs of other eyes are seen in the void; your own glyph is for your gaze alone. Glyphs are broadcast instantly to all who watch.

- State: Zustand (`src/stores/symbolStore.ts`)
- Schema: Zod (`src/domain/index.ts` or relevant file within `src/domain/`)
- Trigger: `src/app/components/Scene.tsx` (onDoubleClick event)
- Manifestation: `src/app/components/SymbolDisplay.tsx` (your glyph), `src/app/components/Eyes.tsx` (others' glyphs)
- To alter the glyphs or their color, change the relevant components.

---

### Efficient Real-Time Communication (Eye & Events)

This project uses Server-Sent Events (SSE) to share eye positions and game events (like symbol inputs) in near real-time among all connected users. Significant effort has been made to minimize bandwidth and server load:

- **Eye Presence**: Your eye's position is sent to the server when you first connect and then periodically when it changes (throttled by `useEyePositionReporting`). If your eye remains idle, its data is automatically purged from the server after a period of inactivity (e.g., 30 seconds as configured in `useEyes.ts` and server-side logic) to keep the active user list fresh. If you move again, your eye will reappear to others.
- **Symbol Events**: Symbol events are triggered by specific actions (e.g., double-click) and are throttled by `useInputThrottle` before transmission.

For a detailed technical explanation of the real-time architecture and bandwidth optimization strategies, please see [`docs/realtime-communication.md`](./docs/realtime-communication.md).

For details on the 3D camera setup, see [`docs/camera-setup.md`](./docs/camera-setup.md).

## Progressive Web App (PWA)

This application is configured as a Progressive Web App (PWA), allowing it to be installed on devices for a more native-like experience. This is achieved using `next-pwa`.

Key PWA features implemented:

- **Web App Manifest**: `public/manifest.json` provides metadata about the application.
- **Service Worker**: `next-pwa` automatically generates a service worker for caching and offline capabilities.
- **Icons**: App icons are provided in `public/icons/`.

For more details on the PWA setup, refer to the `next-pwa` documentation and the project's `next.config.ts`.

## Deployment on Fly.io

This application can be deployed to Fly.io using the provided `Dockerfile` and `fly.toml` configuration.

### Prerequisites

1.  Install `flyctl`: Follow the instructions at [https://fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/).
2.  Login to Fly: Run `fly auth login`.

### Initial Deployment

1.  **Launch the app on Fly.io (if you haven't already):**

    ```sh
    fly launch
    ```

    - Choose an app name (e.g., `planeto`).
    - Select your organization and a region.
    - **IMPORTANT**: Say "No" when asked to set up a Postgres database or Redis, as this application does not require them.
    - A `fly.toml` file will be generated. The provided `fly.toml` in this repository is configured for cost-effectiveness (small machine, auto-stop/start).

2.  **Deploy your application:**
    ```sh
    fly deploy
    ```

### Subsequent Deployments

After making changes to your application, simply run:

```sh
fly deploy
```

Fly.io will use the `Dockerfile` to build and deploy your updated application.

### Monitoring

- View logs: `fly logs -a <your-app-name>`
- Open your deployed app: `fly apps open -a <your-app-name>`
- Access the Fly.io dashboard for more detailed monitoring.

For more detailed deployment and configuration information, see `docs/deployment-flyio.md`.

### API Endpoints

For details on API endpoints, please refer to [`docs/api.md`](./docs/api.md).
