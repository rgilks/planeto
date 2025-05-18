# Planeto - Solar System Visualizer

Planeto is a Next.js application that visualizes a simple planetary system in 3D. All bodies are simulated as planets with real-time gravity and collisions using the Rapier physics engine. The scene is rendered with React Three Fiber.

## Features

- 3D scene with many colored planets
- All bodies are rigid and interact via gravity and collisions (Rapier physics)
- Planets are initialized with different positions, velocities, masses, and radii for interesting orbits
- Camera controls (zoom, rotate) with OrbitControls
- Type-safe domain model for planets using Zod
- Realistic 3D solar system simulation
- Physics-based planetary motion
- Procedural planet textures
- Dynamic sun rendering
- Camera now follows the focused object in world space, always keeping it centered on the screen

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

- To add more planets, update the `planetConfigs` array in `Scene3D.tsx`

## License

MIT

## Technical Notes

- The camera logic was refactored so that it follows the focused object (planet or sun) by updating its position and lookAt target each frame. The previous approach of offsetting the entire group was removed for a more natural and robust camera-following effect.
