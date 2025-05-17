"use client";

import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as ThreeOrbitControls } from "three-stdlib";
import type { UserId, CelestialBodyId } from "@/lib/domain/game.types";
import React, { useRef, useEffect, useState, createRef, Suspense } from "react";
import * as THREE from "three";
import Starfield from "@/components/Starfield";
import { useGameStore } from "@/lib/store/gameStore";
import Spaceship from "./Spaceship";
import Sun from "./Sun";
import Planet from "./Planet";
import { v4 as uuidv4 } from "uuid";
import { Physics, RapierRigidBody } from "@react-three/rapier";
import { SIMULATION_G } from "@/lib/physics";

// Minimal hash function for cloud enabling logic
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

interface CelestialBodyUserData {
  mass: number;
  id: CelestialBodyId;
  // Potentially other data if needed later
}

// Physics Constants for spaceship client-side thrust application
// const SPACESHIP_THRUST_FORCE = 0.1;

// const toVec3 = (p: { x: number; y: number; z: number }) =>
//   new THREE.Vector3(p.x, p.y, p.z);
// const fromVec3 = (v: THREE.Vector3): { x: number; y: number; z: number } => ({
//   x: v.x,
//   y: v.y,
//   z: v.z,
// });

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
  const sunIdRef = useRef<CelestialBodyId | null>(null);
  useEffect(() => {
    if (gameState.celestialBodies) {
      const sunEntry = Object.values(gameState.celestialBodies).find(
        (body) => body?.type === "sun",
      );
      if (sunEntry) {
        sunIdRef.current = sunEntry.id;
      }
    }
  }, [gameState.celestialBodies]);

  const currentSpaceshipId = useGameStore((state) => state.currentSpaceshipId);
  const isConnected = useGameStore((state) => state.isConnected);
  const gameError = useGameStore((state) => state.error);
  const setCurrentUserId = useGameStore((state) => state.setCurrentUserId);
  // const moveMySpaceship = useGameStore((state) => state.moveMySpaceship);

  const connectionAttemptedRef = useRef(false);
  const lastSentThrustInputRef = useRef({ forward: 0, up: 0, strafe: 0 });

  const [thrustInput, setThrustInput] = useState({
    forward: 0,
    up: 0,
    strafe: 0,
  });

  const UPDATE_INTERVAL = 50;
  const lastPhysicsUpdateTimeRef = useRef(0);
  const spaceshipRef = useRef<THREE.Group>(null);
  const orbitControlsRef = useRef<ThreeOrbitControls>(null!);
  const celestialBodyRefs = useRef<React.RefObject<RapierRigidBody>[]>([]);
  const logCounterRef = useRef(0);

  const currentUserSpaceship =
    currentSpaceshipId && gameState
      ? gameState.spaceships[currentSpaceshipId]
      : undefined;

  const rigidBodiesApi = useRef<RapierRigidBody[]>([]);
  // const vec3 = new THREE.Vector3(); // Reusable vector for position
  const force = new THREE.Vector3(); // Reusable vector for force calculations
  const direction = new THREE.Vector3(); // Reusable vector for direction

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
      .map(
        (_, i) => celestialBodyRefs.current[i] || createRef<RapierRigidBody>(),
      );
  }, [gameState.celestialBodies]);

  // Camera control and spaceship input handling logic
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (controlMode === "mouseAimShipControl" && currentUserSpaceship) {
      if (controls && controls.enabled) {
        controls.enabled = false;
      }
      const shipGroup = spaceshipRef.current;
      if (shipGroup) {
        const offset = new THREE.Vector3(0, 1.5, 4);
        const shipWorldPosition = new THREE.Vector3();
        shipGroup.getWorldPosition(shipWorldPosition);
        const shipWorldQuaternion = new THREE.Quaternion();
        shipGroup.getWorldQuaternion(shipWorldQuaternion);

        const cameraPosition = offset
          .clone()
          .applyQuaternion(shipWorldQuaternion)
          .add(shipWorldPosition);
        camera.position.lerp(cameraPosition, 0.1);

        const lookAtOffset = new THREE.Vector3(0, 0, -10);
        const lookAtPosition = lookAtOffset
          .clone()
          .applyQuaternion(shipWorldQuaternion)
          .add(shipWorldPosition);
        camera.lookAt(lookAtPosition);
      }
    } else if (controlMode === "orbitCamera") {
      if (controls) {
        if (!controls.enabled) controls.enabled = true;
        controls.target.set(0, 0, 0);
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
  useFrame((state) => {
    const now = clock.getElapsedTime();

    if (
      currentUserSpaceship &&
      spaceshipRef.current &&
      controlMode === "mouseAimShipControl"
    ) {
      const { pointer } = state;
      const targetRotation = new THREE.Euler(
        -pointer.y * 0.5,
        -pointer.x * 0.5,
        spaceshipRef.current.rotation.z,
        "YXZ",
      );
      spaceshipRef.current.quaternion.setFromEuler(targetRotation);

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
        // Spaceship movement logic is client-driven.
        // Server reconciliation or server-side Rapier for spaceships could be future enhancements.
      }
    }

    // Update rigid bodies from API
    rigidBodiesApi.current = celestialBodyRefs.current
      .map((ref) => ref.current)
      .filter((body): body is RapierRigidBody => body !== null);

    const bodies = rigidBodiesApi.current;

    // Reset forces for all celestial bodies before recalculating gravity
    for (const body of bodies) {
      if (body) {
        body.resetForces(true); // Pass true to also wake the body if it's sleeping
      }
    }

    // Client-side gravity calculation
    const numBodies = bodies.length;
    const minEffectiveDistanceSq = 0.25; // To prevent extreme forces at very close distances

    for (let i = 0; i < numBodies; i++) {
      const body1 = bodies[i];
      if (!body1) continue;
      const userData1 = body1.userData as CelestialBodyUserData;
      if (!userData1 || typeof userData1.mass !== "number") continue;

      const position1 = new THREE.Vector3(
        body1.translation().x,
        body1.translation().y,
        body1.translation().z,
      ); // Fresh vector for safety

      for (let j = i + 1; j < numBodies; j++) {
        const body2 = bodies[j];
        if (!body2) continue;
        const userData2 = body2.userData as CelestialBodyUserData;
        if (!userData2 || typeof userData2.mass !== "number") continue;

        const position2 = new THREE.Vector3(
          body2.translation().x,
          body2.translation().y,
          body2.translation().z,
        ); // Fresh vector

        direction.subVectors(position1, position2); // direction = position1 - position2
        const distanceSq = direction.lengthSq();

        if (distanceSq === 0) continue; // Avoid division by zero

        const mass1 = userData1.mass;
        const mass2 = userData2.mass;

        const forceMagnitude =
          (SIMULATION_G * mass1 * mass2) /
          Math.max(distanceSq, minEffectiveDistanceSq);

        // Log Sun-Planet interactions before force application
        const isP1Sun = userData1.id === sunIdRef.current;
        const isP2Sun = userData2.id === sunIdRef.current;

        if ((isP1Sun && !isP2Sun) || (!isP1Sun && isP2Sun)) {
          const sunData = isP1Sun ? userData1 : userData2;
          const planetData = isP1Sun ? userData2 : userData1;
          const sunPosVec = isP1Sun ? position1 : position2;
          const planetPosVec = isP1Sun ? position2 : position1;

          const vecPlanetToSun = new THREE.Vector3().subVectors(
            sunPosVec,
            planetPosVec,
          );
          const forceOnPlanetIdeal = vecPlanetToSun
            .clone()
            .normalize()
            .multiplyScalar(forceMagnitude);

          logCounterRef.current += 1;
          if (logCounterRef.current % 100 === 0) {
            console.log(
              `NEWLOG T:${clock.getElapsedTime().toFixed(1)} ` +
                `Sun(${sunData.id.substring(0, 2)}):${sunPosVec.x.toFixed(0)},${sunPosVec.y.toFixed(0)},${sunPosVec.z.toFixed(0)} ` +
                `Planet(${planetData.id.substring(0, 2)}):${planetPosVec.x.toFixed(0)},${planetPosVec.y.toFixed(0)},${planetPosVec.z.toFixed(0)} ` +
                `VecPlanetToSun:(${vecPlanetToSun.x.toFixed(1)},${vecPlanetToSun.y.toFixed(1)},${vecPlanetToSun.z.toFixed(1)}) ` +
                `ForceMag:${forceMagnitude.toPrecision(2)} ` +
                `FORCE_ON_PLANET:(${forceOnPlanetIdeal.x.toFixed(1)},${forceOnPlanetIdeal.y.toFixed(1)},${forceOnPlanetIdeal.z.toFixed(1)})`,
            );
          }
        }

        // Force on body2 due to body1: F_21 = G * m1 * m2 / r^2 * (r1-r2)/|r1-r2|
        // direction is (position1 - position2), so it's already pointing from body2 to body1
        force.copy(direction).normalize().multiplyScalar(forceMagnitude);
        body2.addForce(force, true);

        // Force on body1 due to body2: F_12 = -F_21
        body1.addForce(force.clone().multiplyScalar(-1), true);
      }
    }
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
      <ambientLight intensity={0.5} />

      <Starfield count={25000} radius={50000} />

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
          const shouldHaveClouds = simpleHash(body.name) % 3 === 0; // Approx 1/3 of planets get clouds
          return (
            <Planet
              key={body.id}
              celestialBody={body}
              ref={bodyRef}
              enableClouds={shouldHaveClouds}
            />
          );
        }
        return null;
      })}
    </>
  );
};

const SolarSystem3DCanvas = () => {
  const { userId, isLoading } = useCurrentUser();

  return (
    <Canvas
      shadows
      camera={{
        position: [0, 100, 500],
        fov: 50,
        near: 0.1,
        far: 200000,
      }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(window.devicePixelRatio);
      }}
    >
      <Suspense
        fallback={
          <Html center>
            <div className="text-white">Loading Physics...</div>
          </Html>
        }
      >
        <Physics debug={false} gravity={[0, 0, 0]}>
          <SceneContent
            currentUserIdFromHook={userId}
            userLoadingFromHook={isLoading}
          />
        </Physics>
      </Suspense>
    </Canvas>
  );
};

export default SolarSystem3DCanvas;
