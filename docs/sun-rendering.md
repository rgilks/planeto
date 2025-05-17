# Sun Rendering Deep Dive

The visual representation of the sun in Planeto is a critical component for an immersive experience. This document outlines the technical details of its implementation.

## Core Components

1.  **`src/components/Sun.tsx`**: This is the main React component responsible for rendering the sun within the 3D scene. It handles:

    - Positioning the sun based on `CelestialBodyState` data.
    - Creating a `Sphere` mesh from `@react-three/drei`.
    - Applying the custom `SunShaderMaterial` to this sphere.
    - Continuously updating shader uniforms (`time`, `u_cameraPosition`) via the `useFrame` hook from `@react-three/fiber`. The `time` uniform animates the sun's surface, and `u_cameraPosition` allows for effects like the corona which change based on the camera's view relative to the sun.

2.  **`src/components/SunSurfaceMaterial.tsx`**: This file defines the `SunShaderMaterial` class, which extends `THREE.ShaderMaterial`. It contains:

    - **Vertex Shader**: Standard vertex shader code to pass UVs, world position, and world normal to the fragment shader.
    - **Fragment Shader**: The heart of the sun's visual appearance. It implements:
      - **Simplex Noise (snoise)**: A 3D noise function used as a basis for generating procedural textures.
      - **Fractional Brownian Motion (fBM)**: Combines multiple octaves of Simplex noise to create more complex and natural-looking surface patterns. The parameters for fBM (octaves, lacunarity, persistence) control the detail and roughness of these patterns.
      - **Coloring**: The noise values are used to mix between `baseColorDark`, `baseColorBright`, and `highlightColor` to create a fiery, turbulent surface.
      - **Corona Effect**: A rim lighting effect that simulates the sun's atmosphere. It calculates the angle between the view direction and the surface normal to create a glowing outline, especially prominent when viewing the sun at an angle.
      - **Uniforms**: `time` (a float, continuously updated to animate the noise) and `u_cameraPosition` (a `vec3`, the world-space position of the camera, used for the corona).

3.  **`src/lib/r3f-extensions.ts`**: This utility file uses the `extend` function from `@react-three/fiber` to make `SunShaderMaterial` available as a declarative JSX tag (`<sunShaderMaterial />`) within React Three Fiber components. It also augments the `ThreeElements` interface for TypeScript support.

## Rendering Pipeline

- The `SolarSystem3D.tsx` component renders the `Sun` component as part of the scene.
- `Sun.tsx` instantiates the `Sphere` and the `sunShaderMaterial`.
- On each frame, `Sun.tsx` updates the `time` and `u_cameraPosition` uniforms on the `sunShaderMaterial` instance.
- The GPU executes the vertex and fragment shaders for the sun's sphere, calculating the final color for each pixel based on the noise functions, color mixing, and corona effect, resulting in a dynamic and visually appealing sun.

## Customization

The appearance of the sun can be further customized by modifying:

- **Colors**: Adjust `baseColorDark`, `baseColorBright`, `highlightColor`, and `coronaColorValue` in `SunSurfaceMaterial.tsx`.
- **Noise Parameters**: Tweak `octaves`, `lacunarity`, `persistence`, and scaling factors for `fbm` and `snoise` in the fragment shader to change the texture and animation of the sun's surface.
- **Corona Effect**: Modify the `smoothstep` thresholds and `pow` factor in the corona calculation to alter its size and falloff.
- **Sphere Geometry**: The number of segments in the `Sphere` component (`args` prop in `Sun.tsx`) can be increased for a smoother sun, or decreased for performance, though with a detailed shader, higher segmentation is generally preferred.
