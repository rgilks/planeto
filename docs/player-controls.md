# Player Controls Documentation

This document outlines the player control system for the application, focusing on spaceship navigation and camera interaction within the 3D solar system view.

## Control Modes

The system features two primary control modes, which can be toggled using the **`Space`** key:

1.  **Orbit Camera Mode (`orbitCamera`)**:

    - This is the default mode upon loading the 3D view.
    - **Camera Control**: The mouse is used to orbit, pan, and zoom the camera around the scene freely. This uses the standard `OrbitControls` behavior.
    - **Spaceship Control**: In this mode, direct keyboard control of the spaceship is disabled.

2.  **Mouse-Aim Ship Control Mode (`mouseAimShipControl`)**:
    - **Activation**: Press `Space` to switch from Orbit Camera Mode.
    - **Pointer Lock**: Upon entering this mode, clicking on the canvas will activate pointer lock. This hides the mouse cursor and provides direct mouse input for aiming. Press `Esc` to exit pointer lock (standard browser behavior).
    - **Spaceship Aiming**:
      - **Mouse Movement**: Controls the spaceship's pitch (up/down) and yaw (left/right).
    - **Spaceship Thrust**:
      - **`ArrowUp`**: Applies thrust forward, accelerating the spaceship in the direction it's currently facing.
      - **`ArrowDown`**: Applies thrust backward (decelerates or reverses).
    - **Camera Behavior**: The camera automatically follows the player's spaceship, positioned slightly behind and above it, aligning with the ship's orientation. `OrbitControls` are disabled.

## Switching Modes

- Pressing the **`Space`** key toggles between `orbitCamera` and `mouseAimShipControl` modes.
- If pointer lock is active in `mouseAimShipControl` mode, switching to `orbitCamera` mode will automatically release the pointer lock.

## Implementation Details

The control logic is primarily managed within the `SceneContent` component (`src/components/SolarSystem3D.tsx`). It uses a React state variable (`controlMode`) to track the current mode and conditionally applies event listeners and behaviors for keyboard and mouse input. The camera's behavior is also adjusted based on the active `controlMode`.
