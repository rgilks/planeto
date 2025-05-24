# RemoteEyes Component (`src/app/components/RemoteEyes.tsx`)

This document provides a detailed explanation of the `RemoteEyes.tsx` component, which is responsible for visualizing other users' presence and recent keyboard activity in the 3D scene.

## Purpose

The primary purpose of the `RemoteEyes` component is to:

1.  Render a visual representation (an "eye") for each remote user connected to the application.
2.  Position and orient these "eyes" based on the camera data received from those users.
3.  Display symbols near each "eye" corresponding to the most recent key pressed by that remote user, with a visual fade-out effect.

## Key Functionality

### 1. Data Fetching and Management

- **Remote Camera Data**: The component utilizes the `useRemoteCameras()` hook. This hook establishes a connection to the server (likely via Server-Sent Events) and provides a stream of camera position updates from other users.
- **Remote Keyboard Data**: It uses the `useKeyboardStore` (a Zustand store) to access `remoteKeys`. This part of the store holds the latest key pressed by each remote user, along with a timestamp.
- **Eye State Management**: The `useRemoteEyesStore` (another Zustand store) is central to managing the state of each visual "eye".
  - `syncEyes`: This action is called within a `useEffect` hook. It's responsible for creating new eye instances when new remote users are detected (based on `cams` data from `useRemoteCameras`) and removing eye instances for users who are no longer present. It initializes each eye with a copy of the `baseShaderMaterial`.
  - `updateEyeAnimations`: Called every frame via `useFrame`, this action updates properties like `opacity` and `scale` for each managed eye, allowing for animations (e.g., fading in/out).
  - `managedEyes`: This state within the store holds an object where keys are remote user IDs and values are objects representing the eye's current state (position, opacity, scale, material).

### 2. Rendering "Eyes"

- For each entry in `managedEyes`, a `<group>` is rendered. This group serves as a container for the eye mesh and the text symbol.
- **Ref Management**: A `refs.current` object (a `useRef` hook) maps remote user IDs to their corresponding Three.js `Group` or `Mesh` object in the scene. This allows for direct manipulation of these objects in the `useFrame` loop.
- **Positioning and Orientation**:
  - In the `useFrame` loop, the `group.position` is updated to match `eye.position` from `managedEyes` if there's a difference (above `POSITION_UPDATE_THRESHOLD`).
  - `group.lookAt(SUN_POS)` orients each eye to look towards a central point (`SUN_POS`, which is `0,0,0`).
- **Scale and Opacity**:
  - The `group.scale` is updated to match `eye.scale`.
  - The `uOpacity` uniform of the eye's shader material is updated to match `eye.opacity`.

### 3. Shader Material

- A `baseShaderMaterial` is created using `useMemo` with `ShaderMaterial`. This material is used for all eye meshes.
  - **Uniforms**:
    - `tex`: The eye texture loaded from `EYE_TEXTURE_PATH` (`/eye.jpg`).
    - `uOpacity`: A float controlling the overall opacity of the eye, animated via `useRemoteEyesStore`.
  - **Vertex Shader**: A standard vertex shader that calculates `gl_Position` and passes the `normal` vector to the fragment shader as `vNormal`.
  - **Fragment Shader**:
    - Calculates UV coordinates for texture mapping based on the `vNormal`. This technique effectively maps the 2D eye texture onto the 3D sphere.
    - Samples the `tex` (eye texture) using these UVs.
    - Applies a different color (`vec3(0.777, 0.74, 0.74)`) to the back part of the eye (`vNormal.z < -0.85`) to simulate a sclera or a less detailed part.
    - Sets `gl_FragColor` using the sampled texture color and the `uOpacity` uniform.
    - `transparent: true` is set on the material to enable opacity effects.

### 4. Displaying Remote Keyboard Symbols

- If `remoteKeys[eye.id]` exists (meaning the remote user has pressed a key) and the timestamp `remoteKeys[eye.id].ts` is recent (within `TEXT_FADE_DURATION_MS`, e.g., 2000ms):
  - A `<Text>` component (from `@react-three/drei`) is rendered.
  - `getSymbol(remoteKeys[eye.id].key)` converts the pressed key into a visual symbol from the `SYMBOLS` array.
  - **Positioning**: The text is positioned slightly above the eye (`[0, EYE_RADIUS + 6, 0]`).
  - **Appearance**: `fontSize`, `color` (`GREEN`), `anchorX`, `anchorY`, `outlineColor`, `outlineWidth` are set for styling.
  - **Opacity Animation**: `fillOpacity` is calculated based on the eye's opacity and the time elapsed since the key press, creating a fade-out effect for the symbol over `TEXT_FADE_DURATION_MS`.

## State Management Integration

- **`useRemoteEyesStore`**:
  - Manages the creation, deletion, and animation properties (target opacity, scale) of the visual representations of remote users' eyes.
  - The `useFrame` loop in `RemoteEyes.tsx` reads from this store to update the Three.js objects.
- **`useKeyboardStore`**:
  - Provides `remoteKeys`, which is a record of the last key pressed by each remote user and the timestamp of that press.
  - `RemoteEyes.tsx` reads this to display the appropriate symbol with a timed fade-out.
- **`useRemoteCameras()` (hook)**:
  - This custom hook is the source of remote camera data (positions).
  - `RemoteEyes.tsx` uses this data (via `cams`) in its `useEffect` to trigger `syncEyes` in `useRemoteEyesStore`, which in turn updates the positions that `RemoteEyes.tsx` will render.

## Rendering Details in JSX

```jsx
<group
  key={eye.id}
  ref={(el) => { if (el) refs.current[eye.id] = el; }}
  position={eye.position} // Initial position, updated in useFrame
>
  <mesh>
    <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
    <primitive object={eye.material} attach="material" />
  </mesh>
  {/* Conditional rendering of Text for remote key presses */}
  {remoteKeys[eye.id] && /* ... */ && (
    <Text /* ... */ />
  )}
</group>
```

- Each eye is a `<group>` to allow combined transformations for the sphere and text.
- The eye itself is a `<mesh>` with `sphereGeometry`.
- `eye.material` (which is a clone of `baseShaderMaterial` potentially modified by `useRemoteEyesStore`) is attached using `<primitive object={eye.material} attach="material" />`.
- The `<Text>` component for symbols is conditionally rendered within this group.

## Important Constants

- `EYE_RADIUS = 8`: The radius of the sphere geometry used for the eyes.
- `SUN_POS = new Vector3(0, 0, 0)`: The point in space that all eyes look towards.
- `GREEN = "#00FF41"`: Color for the displayed text symbols.
- `EYE_TEXTURE_PATH = "/eye.jpg"`: Path to the eye texture image.
- `POSITION_UPDATE_THRESHOLD = 0.00001`: Small value to prevent unnecessary position updates if the change is negligible.
- `TEXT_FADE_DURATION_MS = 2000`: Duration (in milliseconds) over which the remote key press symbol fades out.

## Interactions and Dependencies

- **`useRemoteCameras()`**: Essential for obtaining remote user camera positions, which dictates where eyes are placed.
- **`useKeyboardStore`**: Provides the data for which symbol to display for each remote user.
- **`useRemoteEyesStore`**: Acts as the intermediary, processing data from `useRemoteCameras` and managing the animated properties of the eyes that `RemoteEyes.tsx` renders.
- **`SYMBOLS` (from `../../lib/domain/keyboard`)**: An array of characters used to derive the visual symbol from a key press.

This component is a crucial piece for multiplayer visibility, combining data from multiple sources to create a dynamic and informative representation of other users in the 3D environment.
