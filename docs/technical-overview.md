# Planeto - Technical Overview

## Vision & Philosophy

Planeto aims to be a visually engaging and interactive tool for exploring planetary systems, initially focusing on the Traveller RPG's Third Imperium setting. The core philosophy is to build a robust, maintainable, and extensible application by leveraging modern web technologies and best practices.

Key principles guiding development:

- **Strong Domain Model:** Utilize Zod schemas to define clear, validated data structures for celestial bodies and systems. This ensures data integrity and provides a single source of truth for our domain entities (`src/lib/domain`).
- **Reactive State Management:** Employ Zustand for managing global application state, such as the currently viewed solar system. Zustand's simplicity and use of Immer for immutable updates make state changes predictable and easier to debug (`src/lib/store`).
- **Component-Based 3D Rendering:** Leverage React Three Fiber (R3F) to build the 3D visualization. This allows us to create reusable components for stars, planets, and other celestial objects, managing them within a familiar React paradigm (`src/components/SolarSystem3D.tsx`).
- **Modern Web Stack:** Utilize Next.js for its powerful features like server-side rendering (though currently client-rendered), routing, and optimized builds. TypeScript provides static typing for improved code quality and maintainability.
- **Iterative Development:** Start with a simple visualization and progressively add features, complexity, and detail (e.g., shaders, more detailed Traveller data, UI controls).

## Core Components & Architecture

- **Next.js App Router:** Manages pages and routing (e.g., `src/app/page.tsx`).
- **Zod Schemas (`src/lib/domain`):** Define the structure and validation rules for `PlanetData`, `StarData`, and `SolarSystemData`.
- **Zustand Store (`src/lib/store`):**
  - `useSolarSystemStore`: Holds the `currentSystem` data and provides actions to modify it.
  - Uses Immer middleware for immutable state updates.
- \*\*React Three Fiber Components (`src/components`):
  - `SolarSystem3D.tsx`:
    - `SolarSystem3DCanvas`: The main R3F canvas that orchestrates the scene.
    - `Star`: Renders the central star of the system.
    - `Planet`: Renders individual planets and their moons (recursively).
    - Utilizes `@react-three/drei` for helpers like `OrbitControls`, `Html` (for labels), and various geometry/material components.
  - `StoreInitializer.tsx`: A client component responsible for loading initial data into the Zustand store.

## Data Flow

1.  **Initial Data:** Sample solar system data is defined in `src/lib/domain/sample-data.ts`.
2.  **Store Initialization:** On the main page (`src/app/page.tsx`), the `StoreInitializer` component loads this sample data into the `useSolarSystemStore`.
3.  **Component Consumption:** The `SolarSystem3DCanvas` component subscribes to the `useSolarSystemStore` to get the `currentSystem` data.
4.  **Rendering:** Based on the `currentSystem` data, `SolarSystem3DCanvas` renders the `Star` and maps over planets to render `Planet` components. Each `Planet` component, in turn, renders its moons.

## Future Directions

- Implement advanced shaders for realistic planet and star appearances.
- Integrate more comprehensive Traveller RPG data for systems and planets.
- Develop UI elements for system selection, time controls, and information display.
- Expand the domain model to include other celestial features (asteroid belts, gas giants with ring systems, space stations).
- Implement backend integration for persistent storage and retrieval of solar system data.

## 3D Scene on Homepage

The homepage features a 3D scene implemented with @react-three/fiber and @react-three/drei's OrbitControls. The scene currently displays a yellow sphere in the center. Users can zoom and rotate the camera using the mouse.

- The 3D scene is encapsulated in `src/app/components/Scene3D.tsx`.
- The component uses React Three Fiber's <Canvas> for rendering.
- OrbitControls from Drei enables intuitive camera controls.
- The scene is rendered full-screen within the main layout.

This setup provides a foundation for future 3D features and interactive content.
