"use client";

import { Sphere, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as ThreeOrbitControls } from "three-stdlib";
import type {
  PlanetData,
  StarData,
  UserId,
  SpaceshipState,
  MoonData,
  SpaceshipId,
} from "@/lib/domain";
import React, {
  useRef,
  Suspense,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as THREE from "three";
import { useSolarSystemStore } from "@/lib/store/useSolarSystemStore";
import { SunShaderMaterial } from "@/components/SunSurfaceMaterial";
import Starfield from "@/components/Starfield";
import { useGameStore } from "@/lib/store/gameStore";
import Spaceship from "./Spaceship";
import { v4 as uuidv4 } from "uuid";

// Physics Constants
const GRAVITATIONAL_CONSTANT = 0.005; // Adjusted for game scale
const MAX_SOLAR_DISTANCE = 1500; // Max distance from star before recovery force
const RECOVERY_FORCE_STRENGTH = 0.02; // Strength of the recovery force
const SPACESHIP_THRUST_FORCE = 0.1; // Magnitude of thrust applied by player
// const SPACESHIP_ROTATION_SPEED = 0.05; // For future torque-based rotation

const ACCELERATION_CHANGE_THRESHOLD_SQUARED = 0.00001; // (approx 0.00316^2) Minimum squared magnitude of acceleration change to trigger an update

// Helper to convert game Position to THREE.Vector3
const toVec3 = (p: { x: number; y: number; z: number }) =>
  new THREE.Vector3(p.x, p.y, p.z);
// Helper to convert THREE.Vector3 to game Position
const fromVec3 = (v: THREE.Vector3): { x: number; y: number; z: number } => ({
  x: v.x,
  y: v.y,
  z: v.z,
});

interface PlanetProps {
  data: PlanetData | MoonData;
  isMoon?: boolean;
}

const Planet = ({ data, isMoon = false }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current && data.orbitalPeriod > 0 && data.orbitRadius > 0) {
      const elapsedTime = clock.getElapsedTime();
      const angle = (elapsedTime / (data.orbitalPeriod * 5)) * 2 * Math.PI;

      const x = data.orbitRadius * Math.cos(angle);
      const z = data.orbitRadius * Math.sin(angle);

      groupRef.current.position.set(x, 0, z);
    } else if (
      groupRef.current &&
      (data.orbitalPeriod === 0 || data.orbitRadius === 0)
    ) {
      groupRef.current.position.set(0, 0, 0);
    }
  });

  const planetScale = isMoon ? data.radius * 0.5 : data.radius;

  return (
    <group ref={groupRef}>
      <Sphere
        ref={meshRef}
        visible
        args={[planetScale, 32, 32]}
        castShadow
        receiveShadow
      >
        <MeshDistortMaterial
          color={data.color || "#808080"}
          attach="material"
          distort={0.1}
          speed={1}
          roughness={0.7}
        />
      </Sphere>
      {data.moons &&
        data.moons.map((moon: MoonData) => {
          return <Planet key={moon.id} data={moon} isMoon={true} />;
        })}
    </group>
  );
};

interface StarProps {
  data: StarData;
}

const Star = ({ data: _data }: StarProps) => {
  const starRadius = _data.radius > 0 ? _data.radius : 2;
  const materialRef = useRef<SunShaderMaterial>(null!);
  const { camera } = useThree();

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.time += delta;
      if (materialRef.current.uniforms["u_cameraPosition"]) {
        materialRef.current.cameraPosition = camera.getWorldPosition(
          new THREE.Vector3()
        );
      }
    }
  });

  return (
    <mesh position={[0, 0, 0]} castShadow>
      <sphereGeometry args={[starRadius, 32, 32]} />
      <sunShaderMaterial ref={materialRef} attach="material" />
    </mesh>
  );
};

const useCurrentUser = (): { userId: UserId | null; isLoading: boolean } => {
  const [userId, setUserId] = useState<UserId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const mockUserId = uuidv4() as UserId;
      // console.log("SolarSystem3D: Assigning mock user ID (UUID):", mockUserId); // Keep this commented or remove
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
  // Hooks, Refs, State (MUST BE AT THE TOP, IN ORDER)
  const currentSystem = useSolarSystemStore((state) => state.currentSystem);
  const { camera, gl, clock } = useThree();
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const [controlMode, setControlMode] = useState<
    "orbitCamera" | "mouseAimShipControl"
  >("orbitCamera");

  const gameState = useGameStore((state) => state.gameState);
  const currentSpaceshipId = useGameStore((state) => state.currentSpaceshipId);
  const isConnected = useGameStore((state) => state.isConnected);
  const gameError = useGameStore((state) => state.error);
  const setCurrentUserId = useGameStore((state) => state.setCurrentUserId);
  const moveMySpaceship = useGameStore((state) => state.moveMySpaceship);

  const connectionAttemptedRef = useRef(false);
  const previousSentAccelerationRef = useRef<THREE.Vector3 | null>(null);
  const lastSentThrustInputRef = useRef({ forward: 0, up: 0, strafe: 0 });

  const [thrustInput, setThrustInput] = useState({
    forward: 0,
    up: 0,
    strafe: 0,
  });

  const UPDATE_INTERVAL = 50;
  const lastPhysicsUpdateTimeRef = useRef(0);
  const lastMouseUpdateTimeRef = useRef(0);
  const spaceshipRef = useRef<THREE.Group>(null);
  const orbitControlsRef = useRef<ThreeOrbitControls>(null!);

  const currentUserSpaceship =
    currentSpaceshipId && gameState
      ? gameState.spaceships[currentSpaceshipId]
      : undefined;

  // Effects (useEffect)
  useEffect(() => {
    canvasElementRef.current = gl.domElement;
  }, [gl]);

  useEffect(() => {
    if (gameError) {
      console.error("SolarSystem3D: Game Store Error:", gameError);
    }
    if (isConnected) {
      // console.log("SolarSystem3D: Connected to game events. SpaceshipID:", currentSpaceshipId);
    } else {
      // console.log("SolarSystem3D: Not connected to game events.");
    }
  }, [gameError, isConnected, currentSpaceshipId]);

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

  // Camera control logic
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
  }, [
    controlMode,
    camera,
    currentUserSpaceship,
    clock,
    spaceshipRef,
    orbitControlsRef,
  ]);

  // Callbacks (useCallback)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setControlMode((prev) => {
          const newMode =
            prev === "orbitCamera" ? "mouseAimShipControl" : "orbitCamera";
          if (
            newMode === "mouseAimShipControl" &&
            canvasElementRef.current &&
            !document.pointerLockElement
          ) {
            canvasElementRef.current
              .requestPointerLock()
              .catch((err) => console.warn("Pointer lock failed:", err));
          } else if (newMode === "orbitCamera" && document.pointerLockElement) {
            document.exitPointerLock();
          }
          return newMode;
        });
        return;
      }

      if (controlMode === "mouseAimShipControl") {
        let changed = true;
        setThrustInput((prev) => {
          const newThrust = { ...prev };
          switch (event.key.toLowerCase()) {
            case "w":
            case "arrowup":
              newThrust.forward = 1;
              break;
            case "s":
            case "arrowdown":
              newThrust.forward = -1;
              break;
            case "a":
            case "arrowleft":
              newThrust.strafe = -1;
              break;
            case "d":
            case "arrowright":
              newThrust.strafe = 1;
              break;
            case "r":
              newThrust.up = 1;
              break;
            case "f":
              newThrust.up = -1;
              break;
            default:
              changed = false;
              break;
          }
          return newThrust;
        });
        if (changed) event.preventDefault();
      }
    },
    [controlMode, setThrustInput, canvasElementRef]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (controlMode === "mouseAimShipControl") {
        let changed = true;
        setThrustInput((prev) => {
          const newThrust = { ...prev };
          switch (event.key.toLowerCase()) {
            case "w":
            case "arrowup":
            case "s":
            case "arrowdown":
              newThrust.forward = 0;
              break;
            case "a":
            case "arrowleft":
            case "d":
            case "arrowright":
              newThrust.strafe = 0;
              break;
            case "r":
            case "f":
              newThrust.up = 0;
              break;
            default:
              changed = false;
              break;
          }
          return newThrust;
        });
        if (changed) event.preventDefault();
      }
    },
    [controlMode, setThrustInput]
  );

  // Mouse move for ship rotation (pointer lock)
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (
        controlMode !== "mouseAimShipControl" ||
        !currentSpaceshipId ||
        !gameState ||
        !document.pointerLockElement
      ) {
        return;
      }
      const currentShip = gameState.spaceships[currentSpaceshipId];
      if (!currentShip) return;

      const newRotation = { ...currentShip.rotation };
      const mouseSensitivity = 0.002;

      newRotation.y -= event.movementX * mouseSensitivity;
      newRotation.x -= event.movementY * mouseSensitivity;
      newRotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, newRotation.x)
      );

      const now = performance.now();
      if (now - lastMouseUpdateTimeRef.current > UPDATE_INTERVAL) {
        moveMySpaceship(
          currentShip.position,
          newRotation,
          currentShip.velocity
        );
        lastMouseUpdateTimeRef.current = now;
      }
    },
    [
      controlMode,
      currentSpaceshipId,
      gameState,
      moveMySpaceship,
      UPDATE_INTERVAL,
      lastMouseUpdateTimeRef,
    ]
  );

  // Event Listener Setup Effects (must also be before early returns)
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const canvasEl = canvasElementRef.current;
    if (!canvasEl) return;

    const acquirePointerLock = () => {
      if (
        controlMode === "mouseAimShipControl" &&
        !document.pointerLockElement
      ) {
        canvasEl
          .requestPointerLock()
          .catch((err) => console.warn("Pointer lock request failed:", err));
      }
    };

    const onPointerLockChange = () => {
      if (document.pointerLockElement === canvasEl) {
        document.addEventListener("mousemove", handleMouseMove, false);
      } else {
        document.removeEventListener("mousemove", handleMouseMove, false);
        if (controlMode === "mouseAimShipControl") {
          setControlMode("orbitCamera");
        }
      }
    };

    canvasEl.addEventListener("click", acquirePointerLock);
    document.addEventListener("pointerlockchange", onPointerLockChange, false);

    return () => {
      canvasEl.removeEventListener("click", acquirePointerLock);
      document.removeEventListener(
        "pointerlockchange",
        onPointerLockChange,
        false
      );
      document.removeEventListener("mousemove", handleMouseMove, false);
      if (document.pointerLockElement === canvasEl) {
        document.exitPointerLock();
      }
    };
  }, [controlMode, handleMouseMove, canvasElementRef]);

  // Frame Loop (useFrame)
  useFrame((_, delta) => {
    if (!currentSystem || !currentSystem.star || !gameState) return;
    const { star } = currentSystem;

    Object.values(gameState.spaceships).forEach((ship) => {
      if (!ship || !ship.mass || ship.mass <= 0) return;

      const shipPositionVec = toVec3(ship.position);
      const shipVelocityVec = toVec3(ship.velocity);
      const netForce = new THREE.Vector3(0, 0, 0);

      if (star) {
        const starPositionVec = new THREE.Vector3(0, 0, 0);
        const vecToStar = new THREE.Vector3().subVectors(
          starPositionVec,
          shipPositionVec
        );
        const distToStarSq = vecToStar.lengthSq();
        if (distToStarSq > 1e-4) {
          const forceMagStar =
            (GRAVITATIONAL_CONSTANT * star.mass * ship.mass) / distToStarSq;
          netForce.add(vecToStar.normalize().multiplyScalar(forceMagStar));
        }

        if (star.planets) {
          const CSEC_elapsedTime = clock.getElapsedTime();
          star.planets.forEach((planet) => {
            if (!planet.mass || planet.mass <= 0) return;

            const planetPositionVec = new THREE.Vector3();
            if (planet.orbitalPeriod > 0 && planet.orbitRadius > 0) {
              const angle =
                (CSEC_elapsedTime / (planet.orbitalPeriod * 5)) * 2 * Math.PI;
              planetPositionVec.set(
                planet.orbitRadius * Math.cos(angle),
                0,
                planet.orbitRadius * Math.sin(angle)
              );
            }

            const vecToPlanet = new THREE.Vector3().subVectors(
              planetPositionVec,
              shipPositionVec
            );
            const distToPlanetSq = vecToPlanet.lengthSq();
            if (distToPlanetSq > 1e-4) {
              const forceMagPlanet =
                (GRAVITATIONAL_CONSTANT * planet.mass * ship.mass) /
                distToPlanetSq;
              netForce.add(
                vecToPlanet.normalize().multiplyScalar(forceMagPlanet)
              );
            }

            if (planet.moons) {
              planet.moons.forEach((moon: MoonData) => {
                if (!moon.mass || moon.mass <= 0) return;
                const moonBasePosition = planetPositionVec.clone();

                const moonPositionVec = new THREE.Vector3();
                if (moon.orbitalPeriod > 0 && moon.orbitRadius > 0) {
                  const moonAngle =
                    (CSEC_elapsedTime / (moon.orbitalPeriod * 2)) * 2 * Math.PI;
                  moonPositionVec.set(
                    moon.orbitRadius * Math.cos(moonAngle),
                    0,
                    moon.orbitRadius * Math.sin(moonAngle)
                  );
                  moonPositionVec.add(moonBasePosition);
                } else {
                  moonPositionVec.copy(moonBasePosition);
                }

                const vecToMoon = new THREE.Vector3().subVectors(
                  moonPositionVec,
                  shipPositionVec
                );
                const distToMoonSq = vecToMoon.lengthSq();
                if (distToMoonSq > 1e-4) {
                  const forceMagMoon =
                    (GRAVITATIONAL_CONSTANT * moon.mass * ship.mass) /
                    distToMoonSq;
                  netForce.add(
                    vecToMoon.normalize().multiplyScalar(forceMagMoon)
                  );
                }
              });
            }
          });
        }

        const distToStar = shipPositionVec.distanceTo(starPositionVec);
        if (distToStar > MAX_SOLAR_DISTANCE) {
          const recoveryForceMag =
            RECOVERY_FORCE_STRENGTH * (distToStar - MAX_SOLAR_DISTANCE);
          const recoveryForceVec = vecToStar
            .normalize()
            .multiplyScalar(recoveryForceMag);
          netForce.add(recoveryForceVec);
        }
      }

      if (
        ship.id === currentSpaceshipId &&
        controlMode === "mouseAimShipControl"
      ) {
        const shipRotation = gameState.spaceships[currentSpaceshipId]
          ?.rotation || { x: 0, y: 0, z: 0 };
        const shipEuler = new THREE.Euler(
          shipRotation.x,
          shipRotation.y,
          shipRotation.z,
          "YXZ"
        );

        const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(shipEuler);
        const upDir = new THREE.Vector3(0, 1, 0).applyEuler(shipEuler);
        const rightDir = new THREE.Vector3(1, 0, 0).applyEuler(shipEuler);

        if (thrustInput.forward !== 0) {
          netForce.add(
            forwardDir.multiplyScalar(
              thrustInput.forward * SPACESHIP_THRUST_FORCE
            )
          );
        }
        if (thrustInput.up !== 0) {
          netForce.add(
            upDir.multiplyScalar(thrustInput.up * SPACESHIP_THRUST_FORCE)
          );
        }
        if (thrustInput.strafe !== 0) {
          netForce.add(
            rightDir.multiplyScalar(thrustInput.strafe * SPACESHIP_THRUST_FORCE)
          );
        }
      }

      const acceleration = netForce.divideScalar(ship.mass);
      const newVelocityVec = shipVelocityVec
        .clone()
        .add(acceleration.multiplyScalar(delta));
      const newPositionVec = shipPositionVec
        .clone()
        .add(newVelocityVec.clone().multiplyScalar(delta));

      if (ship.id === currentSpaceshipId) {
        const currentShipData = gameState.spaceships[currentSpaceshipId];
        if (currentShipData) {
          const now = performance.now();
          const currentCalculatedAcceleration = netForce
            .clone()
            .divideScalar(ship.mass);

          let sendUpdateThisFrame = false;

          if (
            thrustInput.forward !== lastSentThrustInputRef.current.forward ||
            thrustInput.up !== lastSentThrustInputRef.current.up ||
            thrustInput.strafe !== lastSentThrustInputRef.current.strafe
          ) {
            sendUpdateThisFrame = true;
          } else if (previousSentAccelerationRef.current) {
            if (
              previousSentAccelerationRef.current.distanceToSquared(
                currentCalculatedAcceleration
              ) > ACCELERATION_CHANGE_THRESHOLD_SQUARED
            ) {
              sendUpdateThisFrame = true;
            }
          } else if (!previousSentAccelerationRef.current) {
            sendUpdateThisFrame = true;
          }

          if (sendUpdateThisFrame) {
            if (now - lastPhysicsUpdateTimeRef.current > UPDATE_INTERVAL) {
              moveMySpaceship(
                fromVec3(newPositionVec),
                currentShipData.rotation,
                fromVec3(newVelocityVec)
              );
              lastPhysicsUpdateTimeRef.current = now;
              previousSentAccelerationRef.current =
                currentCalculatedAcceleration.clone();
              lastSentThrustInputRef.current = { ...thrustInput };
            }
          }
        }
      }
    });
  });

  // Conditional Rendering / Early Returns (MUST BE AFTER ALL HOOKS)
  if (userLoadingFromHook || !currentSystem || !currentUserIdFromHook) {
    return <div className="text-white text-2xl">Loading Solar System...</div>;
  }

  if (!currentSystem.star) {
    console.error(
      "SceneContent: currentSystem.star is undefined. Cannot render scene."
    );
    return (
      <div className="text-white text-2xl">Error loading system data.</div>
    );
  }
  const { star } = currentSystem;
  const validSpaceships = Object.values(gameState.spaceships).filter(
    (ship): ship is SpaceshipState =>
      Boolean(ship && ship.position && ship.rotation)
  );

  // JSX Return
  return (
    <>
      <Starfield />
      <Suspense fallback={null}>
        <ambientLight intensity={0.2} />
        <pointLight
          position={[0, 0, 0]}
          intensity={star.luminosity > 0 ? star.luminosity * 1.5 : 5}
          distance={MAX_SOLAR_DISTANCE * 2}
          color={
            star.type.toLowerCase().includes("g-type") ? "#FFF8E7" : "#A4D8FF"
          }
          castShadow
        />

        <Star data={star} />
        {star.planets &&
          star.planets.map((planetData) => (
            <Planet key={planetData.id} data={planetData} />
          ))}
        {validSpaceships.map((ship) => (
          <Spaceship
            key={ship.id}
            ref={ship.id === currentSpaceshipId ? spaceshipRef : null}
            id={ship.id as SpaceshipId}
            initialPosition={ship.position}
            initialRotation={ship.rotation}
            isCurrentUser={ship.id === currentSpaceshipId}
          />
        ))}
      </Suspense>
      <OrbitControls
        ref={orbitControlsRef}
        enabled={controlMode === "orbitCamera"}
      />
    </>
  );
};

const SolarSystem3DCanvas = () => {
  const { userId: currentUserIdFromHook, isLoading: userLoadingFromHook } =
    useCurrentUser();
  const currentSystem = useSolarSystemStore((state) => state.currentSystem);

  if (userLoadingFromHook || !currentSystem) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white">Loading system data or user...</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 20, 70], fov: 60 }}
      style={{ background: "#111119" }}
      shadows
      gl={{ antialias: true }}
    >
      <SceneContent
        currentUserIdFromHook={currentUserIdFromHook}
        userLoadingFromHook={userLoadingFromHook}
      />
    </Canvas>
  );
};

export default SolarSystem3DCanvas;
