# Planeto

[![CI/CD](https://github.com/rgilks/planeto/actions/workflows/fly.yml/badge.svg)](https://github.com/rgilks/planeto/actions/workflows/fly.yml)

![planeto Screenshot](/public/screenshot.png)

<div align="center">
  <a href='https://ko-fi.com/N4N31DPNUS' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

Planeto is a Next.js application that visualizes a simple planetary system in 3D. All bodies are simulated as planets with real-time gravity and collisions using the Rapier physics engine. The scene is rendered with React Three Fiber.

## Features

- Physics-based planetary motion
- Procedural planet textures
- Dynamic sun rendering
- Type-safe domain model for planets and keyboard events using Zod
- Camera controls (zoom, rotate) with OrbitControls
- Multiplayer keyboard event broadcasting and visualization

## Physics & Orbits

- All planets are simulated as dynamic rigid bodies
- Gravity is applied between every pair of planets (N-body)
- Planets are given initial velocities to create orbital motion
- Collisions are handled by Rapier, so planets can bounce off each other

## Tech Stack

- Next.js (App Router, TypeScript)
- React Three Fiber (@react-three/fiber)
- Drei (@react-three/drei)
- Rapier physics (@react-three/rapier)
- Zod (domain model)
- Zustand (state management)

## Getting Started

```sh
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the simulation.

## Project Structure

```
planeto/
├── docs/
│   └── technical-overview.md
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── Scene3D.tsx  # Main 3D scene logic (planets, physics, multiplayer events)
│   │   └── page.tsx        # Home page and keyboard event handler
├── README.md
└── ...
```

## Scripts

- `npm run dev`: Start the dev server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Lint the codebase
- `npm run check`: Format, lint, type-check, and run Playwright tests

## Testing

- End-to-end tests with Playwright: `npm run test:e2e`

## Extending

- To add more planets, update the planet generation logic in `Scene3D.tsx`
- To change the keyboard symbol set, edit the `SYMBOLS` array in `src/app/components/KeyboardDisplay.tsx` and `src/app/components/RemoteEyes.tsx`

## License

MIT

## Technical Notes

- The camera is fixed in position and does not follow any object.

## Multiplayer Keyboard Input Display

When a user presses a key, a large green symbol (from a custom set of weird symbols) appears in the bottom-right corner of the screen. This symbol is mapped from the key pressed and is not the literal key. Only remote users' symbols are shown above their eyes in the 3D scene. Keyboard events are broadcast in real time to all players.

- State management: Zustand (`src/lib/store/keyboardStore.ts`)
- Schema validation: Zod (`src/lib/domain/keyboard.ts`)
- Event handling: `src/app/page.tsx`
- Display components: `src/app/components/KeyboardDisplay.tsx` (bottom right), `src/app/components/RemoteEyes.tsx` (3D scene)
- To change the symbol set or color, edit the relevant components.
