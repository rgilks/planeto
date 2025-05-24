# Camera Setup in Scene

The 3D scene (`Scene.tsx`) utilizes `@react-three/fiber` for rendering. The camera configuration is crucial for proper visualization.

## Initialization

The main `Canvas` component is initialized with camera properties including `position`, `near`, and `far` clipping planes.

There are two distinct `Canvas` initializations:

1.  **Loading State:** When `bumpMaps` or `planets` data is not yet available, a fallback `Canvas` is rendered with a static camera position:

    ```typescript
    <Canvas
      camera={{ position: [0, 0, 120], near: 0.1, far: 2000 }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* ... loading state content ... */}
    </Canvas>
    ```

2.  **Main Scene:** Once the necessary data is loaded, the main `Canvas` is rendered with a dynamically generated camera position and the same `near` and `far` values:
    ```typescript
    <Canvas
      camera={{ position: randomEyePos(), near: 0.1, far: 2000 }}
      style={{ width: "100%", height: "100%" }}
      shadows
      // ... other props ...
    >
      {/* ... main scene content ... */}
    </Canvas>
    ```

## Key Camera Properties

- `position`: A 3-element array `[x, y, z]` defining the camera's location in the 3D space.
- `near`: The distance to the near clipping plane. Objects closer than this distance will not be rendered.
- `far`: The distance to the far clipping plane. Objects further than this distance will not be rendered.

Explicitly setting `near` and `far` values is important to prevent rendering issues and ensure that the `applyProps` function within the rendering pipeline can correctly access these properties. The values `0.1` for `near` and `2000` for `far` are used as default.

## OrbitControls

`<OrbitControls>` are used to allow user interaction for rotating and zooming the camera. These controls are configured with damping for smoother interaction and limits for zoom distance.

## Shadow Camera

A `directionalLight` is used for casting shadows. Its shadow camera properties (`shadow-camera-near`, `shadow-camera-far`, etc.) are also configured, but these are specific to the light's shadow map generation and distinct from the main scene camera. The `shadow-camera-far` value informed the choice of `2000` for the main camera's `far` plane.
