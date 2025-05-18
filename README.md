# Planeto - Solar System Visualizer

Planeto is a Next.js application that visualizes a simple planetary system in 3D. All bodies are simulated as planets with real-time gravity and collisions using the Rapier physics engine. The scene is rendered with React Three Fiber.

## Features

- Realistic 3D solar system simulation
- Physics-based planetary motion
- Procedural planet textures
- Dynamic sun rendering
- Camera smoothly follows the focused object in world space, always keeping it centered on the screen
- Type-safe domain model for planets using Zod
- Camera controls (zoom, rotate) with OrbitControls

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
│   │   │   └── Scene3D.tsx  # Main 3D scene logic (planets, physics)
│   │   └── page.tsx        # Home page
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

## License

MIT

## Technical Notes

- The camera logic uses lerp to smoothly follow the focused object, reducing jitter and shaking. The previous approach of offsetting the entire group was removed for a more natural and robust camera-following effect.
