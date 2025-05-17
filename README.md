# Planeto - Solar System Visualizer

Planeto is a Next.js application designed to visualize planets and solar systems, with an initial focus on the Traveller RPG's Third Imperium setting. It uses React Three Fiber for 3D rendering and Zustand for state management.

For a detailed technical overview of the project, its architecture, and design philosophy, please see the [Technical Overview](./docs/technical-overview.md).

## Current Features

- **3D Solar System Visualization:** Renders a sample solar system (Sol system) with a star, planets, and moons.
- **Orbital Mechanics:** Planets and moons exhibit basic orbital motion around their parent bodies.
- **Camera Controls:** Interactive camera using `OrbitControls` allowing users to zoom, pan, and rotate the view.
- **Player Spaceship Controls:**
  - Toggle between free-orbit camera and mouse-aimed spaceship control using the `Space` key.
  - In mouse-aim mode, use mouse to orient the ship and `ArrowUp`/`ArrowDown` for thrust.
  - For detailed information, see [Player Controls Documentation](./docs/player-controls.md).
- **Celestial Body Labels:** Displays names for the star, planets, and moons.
- **Domain Modeling:** Uses Zod schemas for defining `PlanetData`, `StarData`, and `SolarSystemData`.
- **State Management:** Utilizes Zustand with Immer for managing the current solar system data.

## Tech Stack

- **Next.js (with App Router & TypeScript)**
- **React Three Fiber (@react-three/fiber)**
- **Drei (@react-three/drei)**
- **Three.js**
- **Zustand (with Immer)**
- **Zod**

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd planeto
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
planeto/
├── docs/
│   └── technical-overview.md  # Detailed technical documentation
│   └── player-controls.md     # Documentation for player spaceship and camera controls
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages (e.g., page.tsx)
│   ├── components/            # React components (including R3F components)
│   │   ├── SolarSystem3D.tsx  # Core 3D rendering logic
│   │   └── StoreInitializer.tsx # Loads initial state for Zustand
│   ├── lib/
│   │   ├── domain/            # Zod schemas and type definitions
│   │   │   ├── index.ts
│   │   │   └── sample-data.ts
│   │   └── store/             # Zustand store configuration
│   │       └── useSolarSystemStore.ts
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── ... (other configuration files)
```

## Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts a Next.js production server.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run test:e2e`: Runs Playwright end-to-end tests.
- `npm run test:e2e:watch`: Runs Playwright end-to-end tests in watch mode.
- `npm run check`: Formats code with Prettier, lints with Next ESLint (autofixing), performs TypeScript type checking, and runs Playwright tests with a list reporter.

## End-to-End Testing with Playwright

This project uses Playwright for end-to-end (E2E) testing. Playwright allows us to write tests that simulate user interactions with the application in a real browser environment.

### Running Tests

- To run all E2E tests once:
  ```bash
  npm run test:e2e
  ```
- To run E2E tests in watch mode (useful during development):
  ```bash
  npm run test:e2e:watch
  ```

Playwright is configured to automatically start the development server (`npm run dev`) before running tests if it's not already running. Test results will be output to the console, and detailed reports (HTML and JSON) will be generated in the `playwright-report` directory.

### AI-Assisted Debugging

The Playwright setup includes a JSON reporter (`playwright-report/report.json`). This allows AI assistants (like me!) to analyze test failures in a structured way and help diagnose and fix issues. When tests fail, you can share the contents of this report or use monitored terminals so I can observe the test output directly.

Furthermore, the project includes a client-side error logger (`src/components/ClientErrorLogger.tsx`) that captures `console.error`, unhandled promise rejections, and `window.onerror` events from the browser. These errors are then sent to a Next.js API route (`/api/log-error`) which prints them to the server's console. If you run the development server (`npm run dev`) in a monitored terminal, this provides the AI assistant with direct visibility into client-side JavaScript errors, aiding in faster debugging. For more details, see [`docs/debugging.md`](./docs/debugging.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
