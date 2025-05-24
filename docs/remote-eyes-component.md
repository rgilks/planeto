# Eyes Component (`src/app/components/Eyes.tsx`)

This document provides a detailed explanation of the `Eyes.tsx` component, which is responsible for visualizing other users' presence and recent symbol activity in the 3D scene.

## Purpose

The primary purpose of the `Eyes` component is to:

1.  Render a visual representation (an "eye") for each remote user connected to the application.
2.  Position and orient these "eyes" based on the eye data received from those users.
3.  Display symbols near each "eye" corresponding to the most recent key pressed by that remote user, with a visual fade-out effect.

## Key Functionality

### 1. Data Sources and Management

- **Remote Eye Data Stream (`useEyes()` hook)**:
  - The `Eyes` component calls the `useEyes()` hook (from `src/hooks/useEyes.ts`).
  - This hook is responsible for:
    - Ensuring a connection to the server-side event stream (via `useEventStore`).
    - Subscribing to `EyeUpdateEvent` messages from this stream.
    - Storing the raw position (`p`) and timestamp (`t`) of each remote eye in `useEyeStore` (from `src/stores/eyeStore.ts`).
    - Periodically removing stale entries from `useEyeStore`.
    - Returning a simple, memoized array of current remote eye data: `[id, position]`.
- **Visual Eye State Management (`useEyesStore`)**:
  - The `Eyes` component uses `useEyesStore` (from `src/stores/eyesStore.ts`) to manage the state of each _visual_ "eye" being rendered.
  - `syncEyes`: This action is called within a `useEffect` hook in `Eyes.tsx` whenever the data from `useEyes()` changes. It synchronizes `useEyesStore.managedEyes` with the current remote eye data. It creates new eye instances for new remote users (initializing them with a copy of `baseShaderMaterial` and setting them to an "appearing" state) and marks eyes for users who are no longer present as "disappearing". It also updates the `targetPosition` for existing eyes.
  - `updateEyeAnimations`: Called every frame via `useFrame` in `Eyes.tsx`, this action updates animation properties like `opacity`, `scale`, and smoothly interpolates `position` towards `targetPosition` for each eye in `managedEyes`. Eyes that complete their "disappearing" animation are removed.
  - `managedEyes`: This state within `useEyesStore` holds an object where keys are remote user IDs and values are `EyeState` objects (containing position, opacity, scale, status, material).
- **Remote Symbol Data (`useSymbolStore`)**:
  - The component uses `useSymbolStore` (from `src/stores/symbolStore.ts`) to access `remoteKeys`. This part of the store holds the latest key pressed by each remote user, along with a timestamp.

### 2. Rendering "Eyes"

- For each entry in `useEyesStore.managedEyes`, a `<group>` is rendered. This group serves as a container for the eye mesh and the text symbol.
- **Ref Management**: A `refs.current` object (a `useRef` hook in `Eyes.tsx`) maps remote user IDs to their corresponding Three.js `Group` object in the scene. This allows for direct manipulation of these objects based on the animated state from `useEyesStore`.
- **Positioning and Orientation**:
  - In the `useFrame` loop, the `group.position` is updated to match `eye.position` from `managedEyes[eye.id]` (which is being animated by `updateEyeAnimations`).
  - `group.lookAt(SUN_POS)` orients each eye to look towards a central point (`SUN_POS`, which is `0,0,0`).
- **Scale and Opacity**:
  - The `group.scale` is updated to match `eye.scale` from `managedEyes[eye.id]`.
  - The `uOpacity` uniform of the eye's shader material (`eye.material.uniforms.uOpacity.value`) is updated to match `eye.opacity` from `managedEyes[eye.id]`.

### 3. Shader Material

- A `baseShaderMaterial` is created in `Eyes.tsx` using `useMemo` with `ShaderMaterial`. This material is cloned for each eye instance by `useEyesStore`.
  - **Uniforms**:
    - `tex`: The eye texture loaded from `EYE_TEXTURE_PATH` (`/eye.jpg`).
    - `uOpacity`: A float controlling the overall opacity of the eye, animated via `useEyesStore`.
  - **Vertex Shader**: A standard vertex shader that calculates `gl_Position` and passes the `normal` vector to the fragment shader as `vNormal`.
  - **Fragment Shader**:
    - Calculates UV coordinates for texture mapping based on the `vNormal`. This technique effectively maps the 2D eye texture onto the 3D sphere.
    - Samples the `tex` (eye texture) using these UVs.
    - Applies a different color (`vec3(0.777, 0.74, 0.74)`) to the back part of the eye (`vNormal.z < -0.85`) to simulate a sclera or a less detailed part.
    - Sets `gl_FragColor` using the sampled texture color and the `uOpacity` uniform.
    - `transparent: true` is set on the material to enable opacity effects.

### 4. Displaying Remote Symbol Symbols

- If `remoteKeys[eye.id]` exists (meaning the remote user has pressed a key) and the timestamp `remoteKeys[eye.id].ts` is recent (within `TEXT_FADE_DURATION_MS`, e.g., 2000ms):
  - A `<Text>` component (from `@react-three/drei`) is rendered.
  - `getSymbol(remoteKeys[eye.id].key)` converts the pressed key into a visual symbol from the `SYMBOLS` array (from `@/domain`).
  - **Positioning**: The text is positioned slightly above the eye (`[0, EYE_RADIUS + 6, 0]`).
  - **Appearance**: `fontSize`, `color` (`GREEN`), `anchorX`, `anchorY`, `outlineColor`, `outlineWidth` are set for styling.
  - **Opacity Animation**: `fillOpacity` is calculated based on the eye's current opacity (from `managedEyes[eye.id].opacity`) and the time elapsed since the key press, creating a fade-out effect for the symbol over `TEXT_FADE_DURATION_MS`.

## State Management Integration

- **`useEventStore` (from `src/stores/eventStore.ts`)**: (Indirectly used via `useEyes`)
  - Manages the underlying SSE connection and dispatches raw events.
- **`useEyeStore` (from `src/stores/eyeStore.ts`)**: (Used by `useEyes` hook)
  - Stores the latest raw position and timestamp for each remote eye: `{ id: { p: Vec3, t: number } }`.
  - Handles pruning of stale eye data.
- **`useEyes()` hook (from `src/hooks/useEyes.ts`)**:
  - Consumes data from `useEventStore` (via subscription) and updates `useEyeStore`.
  - Provides `Eyes.tsx` with a clean list of active remote eye `[id, position]` data.
- **`useEyesStore` (from `src/stores/eyesStore.ts`)**:
  - Manages the _visual animation state_ of each eye: `managedEyes: { id: EyeState }`.
  - `syncEyes` action processes data from `useEyes()` to add, update the target state of, or mark eyes for removal in `managedEyes`.
  - `updateEyeAnimations` action (called in `useFrame`) animates the properties in `managedEyes` (position, opacity, scale) and removes fully faded-out eyes.
- **`useSymbolStore` (from `src/stores/symbolStore.ts`)**:
  - Provides `remoteKeys`, which is a record of the last key pressed by each remote user and the timestamp of that press.
  - `Eyes.tsx` reads this to display the appropriate symbol with a timed fade-out.

## Rendering Details in JSX

```jsx
<group
  key={eye.id} // eye here refers to an entry from useEyesStore.managedEyes
  ref={(el) => { if (el) refs.current[eye.id] = el; }}
  // Position, scale, and material opacity are driven by useFrame updates from useEyesStore
>
  <mesh>
    <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
    {/* eye.material is from useEyesStore.managedEyes[eye.id].material */}
    <primitive object={managedEyes[eye.id]?.material} attach="material" />
  </mesh>
  {/* Conditional rendering of Text for remote key presses */}
  {remoteKeys[eye.id] && /* ... */ && (
    <Text fillOpacity={/* animated based on managedEyes[eye.id].opacity and time */} /* ... */ />
  )}
</group>
```

- Each eye is a `<group>` to allow combined transformations for the sphere and text.
- The eye itself is a `<mesh>` with `sphereGeometry`.
- The material for the eye is taken from `managedEyes[eye.id].material` which is initialized and managed by `useEyesStore`.
- The `<Text>` component for symbols is conditionally rendered within this group, with its opacity also influenced by the eye's animation state.

## Important Constants

- `EYE_RADIUS = 8`: The radius of the sphere geometry used for the eyes.
- `SUN_POS = new Vector3(0, 0, 0)`: The point in space that all eyes look towards.
- `GREEN = "#00FF41"`: Color for the displayed text symbols.
- `EYE_TEXTURE_PATH = "/eye.jpg"`: Path to the eye texture image.
- `TEXT_FADE_DURATION_MS = 2000`: Duration (in milliseconds) over which the remote key press symbol fades out.

## Interactions and Dependencies

- **`useEyes()` hook**: Essential for obtaining remote user eye positions.
- **`useEyeStore`**: Stores raw eye data, used by `useEyes()`.
- **`useEyesStore`**: Manages the animated visual state of the eyes that `Eyes.tsx` renders.
- **`useSymbolStore`**: Provides the data for which symbol to display for each remote user.
- **`SYMBOLS` (from `@/domain`)**: An array of characters used to derive the visual symbol from a key press.

This component is a crucial piece for multiplayer visibility, combining data from multiple sources to create a dynamic and informative representation of other users in the 3D environment.
