"use client";

import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as ThreeOrbitControls } from "three-stdlib";
import type {
  UserId,
  // SpaceshipState, // Removed as unused
} from "@/lib/domain/game.types";
import React, {
  useRef,
  // Suspense, // Removed as unused
  useEffect,
  useState,
  // useCallback, // Removed as unused
  createRef,
} from "react";
import * as THREE from "three";
import Starfield from "@/components/Starfield";
import { useGameStore } from "@/lib/store/gameStore";
import Spaceship from "./Spaceship";
import Sun from "./Sun";
import Planet from "./Planet";
import { v4 as uuidv4 } from "uuid";

// Physics Constants for spaceship client-side thrust application
const SPACESHIP_THRUST_FORCE = 0.1;
// const ACCELERATION_CHANGE_THRESHOLD_SQUARED = 0.00001; // Removed as unused

const toVec3 = (p: { x: number; y: number; z: number }) =>
  new THREE.Vector3(p.x, p.y, p.z);
const fromVec3 = (v: THREE.Vector3): { x: number; y: number; z: number } => ({
  x: v.x,
  y: v.y,
  z: v.z,
});

const useCurrentUser = (): { userId: UserId | null; isLoading: boolean } => {
  const [userId, setUserId] = useState<UserId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const mockUserId = uuidv4() as UserId;
      setUserId(mockUserId);
      setIsLoading(false);
    }, 500);
  }, []);

  return { userId, isLoading };
};

interface SceneContentProps {
  currentUserIdFromHook: UserId | null;
  userLoadingFromHook: boolean;
}

const SceneContent = ({
  currentUserIdFromHook,
  userLoadingFromHook,
}: SceneContentProps) => {
  const { camera, gl, clock } = useThree();
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const [controlMode, setControlMode] = useState<
    "orbitCamera" | "mouseAimShipControl"
  >("orbitCamera");

  const gameState = useGameStore((state) => state.gameState);
  // console.log("Celestial Bodies from GameState:", gameState.celestialBodies);
  const currentSpaceshipId = useGameStore((state) => state.currentSpaceshipId);
  const isConnected = useGameStore((state) => state.isConnected);
  const gameError = useGameStore((state) => state.error);
  const setCurrentUserId = useGameStore((state) => state.setCurrentUserId);
  const moveMySpaceship = useGameStore((state) => state.moveMySpaceship);

  const connectionAttemptedRef = useRef(false);
  // const previousSentAccelerationRef = useRef<THREE.Vector3 | null>(null); // Removed as unused
  const lastSentThrustInputRef = useRef({ forward: 0, up: 0, strafe: 0 });

  const [thrustInput, setThrustInput] = useState({
    forward: 0,
    up: 0,
    strafe: 0,
  });

  const UPDATE_INTERVAL = 50;
  const lastPhysicsUpdateTimeRef = useRef(0); // Renamed from lastMouseUpdateTimeRef for clarity
  const spaceshipRef = useRef<THREE.Group>(null);
  const orbitControlsRef = useRef<ThreeOrbitControls>(null!);
  const celestialBodyRefs = useRef<React.RefObject<THREE.Group>[]>([]);

  const currentUserSpaceship =
    currentSpaceshipId && gameState
      ? gameState.spaceships[currentSpaceshipId]
      : undefined;

  useEffect(() => {
    canvasElementRef.current = gl.domElement;
  }, [gl]);

  useEffect(() => {
    if (gameError) {
      console.error("SolarSystem3D: Game Store Error:", gameError);
    }
  }, [gameError]);

  useEffect(() => {
    if (
      currentUserIdFromHook &&
      !userLoadingFromHook &&
      !connectionAttemptedRef.current
    ) {
      setCurrentUserId(currentUserIdFromHook);
      connectionAttemptedRef.current = true;
    }
  }, [currentUserIdFromHook, userLoadingFromHook, setCurrentUserId]);

  useEffect(() => {
    const bodyCount = Object.keys(gameState.celestialBodies || {}).length;
    celestialBodyRefs.current = Array(bodyCount)
      .fill(null)
      .map((_, i) => celestialBodyRefs.current[i] || createRef<THREE.Group>());
  }, [gameState.celestialBodies]);

  // Camera control and spaceship input handling logic
  useEffect(() => {
    // ... (existing camera control logic based on controlMode) ...
    // This useEffect handles camera switches and updates based on controlMode
    // and currentUserSpaceship.position for chase cam.
    // It does NOT calculate physics.
    const controls = orbitControlsRef.current;
    if (controlMode === "mouseAimShipControl" && currentUserSpaceship) {
      if (controls && controls.enabled) {
        controls.enabled = false;
      }
      const shipGroup = spaceshipRef.current;
      if (shipGroup) {
        const offset = new THREE.Vector3(0, 1.5, 4); // Camera offset from ship
        const shipWorldPosition = new THREE.Vector3();
        shipGroup.getWorldPosition(shipWorldPosition);
        const shipWorldQuaternion = new THREE.Quaternion();
        shipGroup.getWorldQuaternion(shipWorldQuaternion);

        const cameraPosition = offset
          .clone()
          .applyQuaternion(shipWorldQuaternion)
          .add(shipWorldPosition);
        camera.position.lerp(cameraPosition, 0.1);

        const lookAtOffset = new THREE.Vector3(0, 0, -10); // Look ahead of the ship
        const lookAtPosition = lookAtOffset
          .clone()
          .applyQuaternion(shipWorldQuaternion)
          .add(shipWorldPosition);
        camera.lookAt(lookAtPosition);
      }
    } else if (controlMode === "orbitCamera") {
      if (controls) {
        if (!controls.enabled) controls.enabled = true;
        controls.target.set(0, 0, 0); // Default target for now
        controls.update();
      }
    }
  }, [controlMode, currentUserSpaceship, camera, clock]);

  // Keyboard input handling for spaceship thrust AND control mode toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "c") {
        setControlMode((prev) =>
          prev === "orbitCamera" ? "mouseAimShipControl" : "orbitCamera",
        );
        // Pointer lock management could be re-added here if desired
        return;
      }

      setThrustInput((prev) => {
        switch (event.key.toLowerCase()) {
          case "w":
            return { ...prev, forward: 1 };
          case "s":
            return { ...prev, forward: -1 };
          case "a":
            return { ...prev, strafe: -1 };
          case "d":
            return { ...prev, strafe: 1 };
          case " ":
          case "spacebar":
            return { ...prev, up: 1 };
          case "shift":
          case "x":
            return { ...prev, up: -1 };
          default:
            return prev;
        }
      });
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      setThrustInput((prev) => {
        switch (event.key.toLowerCase()) {
          case "w":
          case "s":
            return { ...prev, forward: 0 };
          case "a":
          case "d":
            return { ...prev, strafe: 0 };
          case " ":
          case "spacebar":
          case "shift":
          case "x":
            return { ...prev, up: 0 };
          default:
            return prev;
        }
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [controlMode, setControlMode]);

  // Main game loop for client-side updates
  useFrame((state, delta) => {
    const now = clock.getElapsedTime();

    if (
      currentUserSpaceship &&
      spaceshipRef.current &&
      controlMode === "mouseAimShipControl"
    ) {
      const ship = currentUserSpaceship;
      const shipGroup = spaceshipRef.current;

      const { pointer } = state;
      const targetRotation = new THREE.Euler(
        -pointer.y * 0.5,
        -pointer.x * 0.5,
        shipGroup.rotation.z,
        "YXZ",
      );
      shipGroup.quaternion.setFromEuler(targetRotation);

      const thrustForceVec = new THREE.Vector3(
        thrustInput.strafe,
        thrustInput.up,
        -thrustInput.forward,
      )
        .multiplyScalar(SPACESHIP_THRUST_FORCE)
        .applyQuaternion(shipGroup.quaternion);

      // The current `moveMySpaceship` action takes absolute new position, rotation, velocity.
      // The logic below tries to send updates if thrust input changes or at a regular interval if moving.
      // This is a simplified approach to client-side prediction and server updates.
      // More robust handling would involve more complex state reconciliation.
      const hasThrustInput =
        thrustInput.forward !== 0 ||
        thrustInput.up !== 0 ||
        thrustInput.strafe !== 0;

      if (
        now - lastPhysicsUpdateTimeRef.current > UPDATE_INTERVAL / 1000 ||
        (hasThrustInput &&
          (thrustInput.forward !== lastSentThrustInputRef.current.forward ||
            thrustInput.up !== lastSentThrustInputRef.current.up ||
            thrustInput.strafe !== lastSentThrustInputRef.current.strafe))
      ) {
        // Current ship state (position, velocity) is from the server.
        // Calculate a target new state based on inputs to send to the server.
        // This is an optimistic update for the client and a command for the server.

        // This is not a persistent velocity, but an instantaneous change due to thrust for this tick.
        const effectiveVelocityChange = thrustForceVec
          .clone()
          .multiplyScalar(delta);

        // Note: This is a simplified approach. True client-side prediction is more complex.
        const newPosition = toVec3(ship.position).add(effectiveVelocityChange);

        // For velocity to send to server: current velocity + impulse from thrust.
        // Server might recalculate or use this as a hint.
        const newVelocity = toVec3(ship.velocity).add(
          effectiveVelocityChange.clone().divideScalar(delta),
        );

        moveMySpaceship(
          fromVec3(newPosition),
          {
            x: shipGroup.rotation.x,
            y: shipGroup.rotation.y,
            z: shipGroup.rotation.z,
          },
          fromVec3(newVelocity),
        );
        lastPhysicsUpdateTimeRef.current = now;
        lastSentThrustInputRef.current = { ...thrustInput };
      }
    }
    // Removed spaceship physics calculations (gravity etc.) as server handles it.
  });

  if (userLoadingFromHook) {
    return (
      <Html center>
        <div className="text-white text-2xl bg-black/50 p-4 rounded">
          Loading User Data...
        </div>
      </Html>
    );
  }
  if (!isConnected && !connectionAttemptedRef.current) {
    return (
      <Html center>
        <div className="text-white text-2xl bg-black/50 p-4 rounded">
          Connecting to server...
        </div>
      </Html>
    );
  }
  if (!currentUserSpaceship && isConnected) {
    return (
      <Html center>
        <div className="text-white text-2xl bg-black/50 p-4 rounded">
          Initializing spaceship...
        </div>
      </Html>
    );
  }
  if (!currentSpaceshipId && isConnected) {
    return (
      <Html center>
        <div className="text-white text-2xl bg-black/50 p-4 rounded">
          Waiting for spaceship assignment...
        </div>
      </Html>
    );
  }

  const allSpaceships = Object.values(gameState.spaceships || {});
  const allCelestialBodies = Object.values(gameState.celestialBodies || {});

  return (
    <>
      <OrbitControls
        ref={orbitControlsRef}
        enabled={controlMode === "orbitCamera"}
      />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Starfield />

      {allSpaceships.map((ship) => {
        if (!ship) return null;
        const isCurrentUserShip = ship.id === currentSpaceshipId;
        const spaceshipSpecificProps = isCurrentUserShip
          ? {}
          : { color: "#FFC0CB" };

        return (
          <Spaceship
            key={ship.id}
            ref={isCurrentUserShip ? spaceshipRef : null}
            id={ship.id}
            initialPosition={ship.position}
            initialRotation={ship.rotation}
            isCurrentUser={isCurrentUserShip}
            {...spaceshipSpecificProps}
          />
        );
      })}

      {allCelestialBodies.map((body, index) => {
        if (!body) return null;
        const bodyRef = celestialBodyRefs.current[index];
        if (body.type === "sun") {
          return <Sun key={body.id} celestialBody={body} ref={bodyRef} />;
        }
        if (body.type === "planet") {
          return <Planet key={body.id} celestialBody={body} ref={bodyRef} />;
        }
        return null;
      })}
    </>
  );
};

const SolarSystem3DCanvas = () => {
  const { userId: currentUserIdFromHook, isLoading: userLoadingFromHook } =
    useCurrentUser();

  // Loading state handled by SceneContent or the main return block below
  if (userLoadingFromHook) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-white text-2xl">
          Loading User Authentication...
        </div>
      </div>
    );
  }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 20, 100], fov: 50 }}
      style={{ background: "#000000" }}
      onPointerDown={(e) => {
        if (useGameStore.getState().currentSpaceshipId && e.button === 0) {
          // Pointer lock logic can be re-enabled here if needed
        }
      }}
    >
      <SceneContent
        currentUserIdFromHook={currentUserIdFromHook}
        userLoadingFromHook={userLoadingFromHook}
      />
    </Canvas>
  );
};

export default SolarSystem3DCanvas;
