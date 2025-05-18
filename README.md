# Planeto - Solar System Visualizer

Planeto is a Next.js application that visualizes a simple solar system in 3D. It features a Sun and four planets, all simulated as rigid bodies with real-time gravity and collisions using the Rapier physics engine. The scene is rendered with React Three Fiber and includes a distant star field for visual depth.

## Features

- 3D scene with a Sun and 4 colored planets
- All bodies are rigid and interact via gravity and collisions (Rapier physics)
- Planets are initialized with different positions, velocities, masses, and radii for interesting orbits
- Distant star field rendered as small spheres in the background
- Camera controls (zoom, rotate) with OrbitControls
- Type-safe domain model for stars and star fields using Zod

## Physics & Orbits

- The Sun and planets are simulated as dynamic rigid bodies
- Gravity is applied between the Sun and each planet (N-body, Sun-planet only)
- Planets are given initial velocities to create orbital motion
- Collisions are handled by Rapier, so planets and the Sun can bounce off each other

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
│   │   │   └── Scene3D.tsx  # Main 3D scene logic (Sun, planets, star field, physics)
│   │   └── page.tsx        # Home page
│   ├── lib/
│   │   └── domain/
│   │       └── starField.ts # Zod schemas for star field
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

## Star Field

- Procedurally generated, distant, static star field
- Domain model in `src/lib/domain/starField.ts` (Zod)

## Physics

- Sun and planets are dynamic rigid bodies
- Gravity and collisions handled by Rapier
- Orbits emerge from initial conditions

## Extending

- To add more planets, update the `planetConfigs` array in `Scene3D.tsx`
- To change star field properties, update the generator in `starField.ts` and `Scene3D.tsx`

## License

MIT
