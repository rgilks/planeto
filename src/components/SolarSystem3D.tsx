"use client";

import { Sphere, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as ThreeOrbitControls } from "three-stdlib";
import type {
  PlanetData,
  StarData,
  UserId,
  SpaceshipState,
  Position,
  Rotation,
} from "@/lib/domain";
import React, { useRef, Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { useSolarSystemStore } from "@/lib/store/useSolarSystemStore";
import { SunShaderMaterial } from "@/components/SunSurfaceMaterial";
import Starfield from "@/components/Starfield";
import { useGameStore } from "@/lib/store/gameStore";
import Spaceship from "./Spaceship";
import { v4 as uuidv4 } from "uuid";

interface PlanetProps {
  data: PlanetData;
  isMoon?: boolean;
}

const Planet = ({ data, isMoon = false }: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const elapsedTime = clock.getElapsedTime();
      const angle = (elapsedTime / (data.orbitalPeriod * 5)) * 2 * Math.PI;

      const x = data.orbitRadius * Math.cos(angle);
      const z = data.orbitRadius * Math.sin(angle);

      groupRef.current.position.set(x, 0, z);
    }
  });

  const planetScale = isMoon ? data.radius * 0.5 : data.radius;

  return (
    <group ref={groupRef}>
      <Sphere
        ref={meshRef}
        visible
        args={[planetScale, 32, 32]}
        scale={isMoon ? 0.5 : 1}
        castShadow
        receiveShadow
      >
        <MeshDistortMaterial
          color={data.color}
          attach="material"
          distort={0.1}
          speed={1}
          roughness={0.7}
        />
      </Sphere>
      {data.moons &&
        data.moons.map((moon: PlanetData) => {
          return <Planet key={moon.id} data={moon} isMoon={true} />;
        })}
    </group>
  );
};

interface StarProps {
  data: StarData;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Star = ({ data: _data }: StarProps) => {
  const starRadius = 2;
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
      {/* <Html distanceFactor={20} position={[0, starRadius + 0.5, 0]}>
        <div className="text-white text-sm bg-black bg-opacity-75 p-1 rounded whitespace-nowrap">
          {data.name} ({data.type})
        </div>
      </Html> */}
    </mesh>
  );
};

// Placeholder for how you might get the current user's ID
const useCurrentUser = (): { userId: UserId | null; isLoading: boolean } => {
  const [userId, setUserId] = useState<UserId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const mockUserId = uuidv4() as UserId;
      console.log("SolarSystem3D: Assigning mock user ID (UUID):", mockUserId);
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
  const currentSystem = useSolarSystemStore((state) => state.currentSystem);
  const { camera, gl } = useThree();
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    canvasElementRef.current = gl.domElement;
  }, [gl]);

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

  useEffect(() => {
    if (isConnected) {
      console.log("SolarSystem3D: Connected to game events.");
      if (currentSpaceshipId) {
        console.log("SolarSystem3D: My spaceship ID:", currentSpaceshipId);
      } else {
        console.log("SolarSystem3D: Waiting for my spaceship ID...");
      }
    } else {
      console.log("SolarSystem3D: Not connected to game events.");
    }
    if (gameError) {
      console.error("SolarSystem3D: Game Store Error:", gameError);
    }
  }, [isConnected, currentSpaceshipId, gameError]);

  useEffect(() => {
    if (
      currentUserIdFromHook &&
      !userLoadingFromHook &&
      !connectionAttemptedRef.current
    ) {
      console.log(
        "SolarSystem3D: Current User ID available, attempting to set in game store and connect:",
        currentUserIdFromHook
      );
      setCurrentUserId(currentUserIdFromHook);
      connectionAttemptedRef.current = true;
    }
  }, [currentUserIdFromHook, userLoadingFromHook, setCurrentUserId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setControlMode((prev) => {
          const newMode =
            prev === "orbitCamera" ? "mouseAimShipControl" : "orbitCamera";
          if (
            newMode === "orbitCamera" &&
            document.pointerLockElement &&
            canvasElementRef.current &&
            document.pointerLockElement === canvasElementRef.current
          ) {
            document.exitPointerLock();
          }
          return newMode;
        });
        return;
      }

      if (
        controlMode === "mouseAimShipControl" &&
        currentSpaceshipId &&
        gameState.spaceships[currentSpaceshipId]
      ) {
        const currentShip = gameState.spaceships[currentSpaceshipId]!;
        const newPosition: Position = { ...currentShip.position };
        const shipCurrentRotation = currentShip.rotation;

        const moveSpeed = 0.2;
        let positionChanged = false;

        switch (event.key) {
          case "ArrowUp":
            {
              const forward = new THREE.Vector3(0, 0, -1);
              forward.applyEuler(
                new THREE.Euler(
                  shipCurrentRotation.x,
                  shipCurrentRotation.y,
                  shipCurrentRotation.z,
                  "YXZ"
                )
              );
              newPosition.x += forward.x * moveSpeed;
              newPosition.y += forward.y * moveSpeed;
              newPosition.z += forward.z * moveSpeed;
              positionChanged = true;
            }
            break;
          case "ArrowDown":
            {
              const backward = new THREE.Vector3(0, 0, 1);
              backward.applyEuler(
                new THREE.Euler(
                  shipCurrentRotation.x,
                  shipCurrentRotation.y,
                  shipCurrentRotation.z,
                  "YXZ"
                )
              );
              newPosition.x += backward.x * moveSpeed;
              newPosition.y += backward.y * moveSpeed;
              newPosition.z += backward.z * moveSpeed;
              positionChanged = true;
            }
            break;
        }

        if (positionChanged) {
          moveMySpaceship(newPosition, shipCurrentRotation);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    controlMode,
    currentSpaceshipId,
    gameState,
    moveMySpaceship,
    setControlMode,
    canvasElementRef,
  ]);

  useEffect(() => {
    const canvasEl = canvasElementRef.current;

    if (controlMode !== "mouseAimShipControl" || !canvasEl) {
      if (
        document.pointerLockElement &&
        canvasEl &&
        document.pointerLockElement === canvasEl
      ) {
        document.exitPointerLock();
      }
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (
        !currentSpaceshipId ||
        !document.pointerLockElement ||
        document.pointerLockElement !== canvasEl
      ) {
        return;
      }

      const latestShipState =
        useGameStore.getState().gameState.spaceships[currentSpaceshipId];
      if (!latestShipState) return;

      const newRotation: Rotation = { ...latestShipState.rotation };
      const mouseSensitivity = 0.002;

      newRotation.y -= event.movementX * mouseSensitivity;
      newRotation.x -= event.movementY * mouseSensitivity;
      newRotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, newRotation.x)
      );

      moveMySpaceship(latestShipState.position, newRotation);
    };

    const handleCanvasClick = () => {
      if (
        controlMode === "mouseAimShipControl" &&
        canvasEl &&
        !document.pointerLockElement
      ) {
        canvasEl.requestPointerLock().catch((err) => {
          console.warn("SolarSystem3D: Failed to request pointer lock:", err);
        });
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement === canvasEl) {
        document.addEventListener("mousemove", handleMouseMove, false);
      } else {
        document.removeEventListener("mousemove", handleMouseMove, false);
      }
    };

    canvasEl.addEventListener("click", handleCanvasClick);
    document.addEventListener(
      "pointerlockchange",
      handlePointerLockChange,
      false
    );

    return () => {
      canvasEl.removeEventListener("click", handleCanvasClick);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
        false
      );
      document.removeEventListener("mousemove", handleMouseMove, false);
      if (
        document.pointerLockElement &&
        document.pointerLockElement === canvasEl
      ) {
        document.exitPointerLock();
      }
    };
  }, [controlMode, currentSpaceshipId, moveMySpaceship, canvasElementRef]);

  const orbitControlsRef = useRef<ThreeOrbitControls>(null!);

  const mySpaceshipForCamera = currentSpaceshipId
    ? gameState.spaceships[currentSpaceshipId]
    : undefined;

  useEffect(() => {
    const controls = orbitControlsRef.current;
    const ship = mySpaceshipForCamera;

    if (!ship) return;

    const shipPositionVec = new THREE.Vector3(
      ship.position.x,
      ship.position.y,
      ship.position.z
    );

    if (controlMode === "mouseAimShipControl") {
      if (controls && controls.enabled) {
        controls.enabled = false;
      }

      const shipRotationEuler = new THREE.Euler(
        ship.rotation.x,
        ship.rotation.y,
        ship.rotation.z,
        "YXZ"
      );
      const cameraOffsetLocal = new THREE.Vector3(0, 1.5, 4);
      const desiredCameraPosition = shipPositionVec
        .clone()
        .add(cameraOffsetLocal.applyEuler(shipRotationEuler));

      camera.position.lerp(desiredCameraPosition, 0.1);
      camera.lookAt(shipPositionVec);
    } else if (controlMode === "orbitCamera") {
      if (controls) {
        controls.update();
      }
    }
  }, [mySpaceshipForCamera, controlMode, camera, orbitControlsRef]);

  if (!currentSystem) {
    // This check might be redundant if SolarSystem3DCanvas handles it,
    // but good for safety if SceneContent could be rendered independently.
    return null;
  }

  return (
    <>
      <Starfield />
      <Suspense fallback={null}>
        <ambientLight intensity={0.1} />
        <pointLight
          position={[0, 0, 0]}
          intensity={5}
          distance={3000}
          color={
            currentSystem.star.type.toLowerCase().includes("g-type")
              ? "#FFF8E7"
              : "#A4D8FF"
          }
          castShadow
        />

        <Star data={currentSystem.star} />
        {currentSystem.star.planets.map((planet: PlanetData) => (
          <Planet key={planet.id} data={planet} />
        ))}
        {Object.values(gameState.spaceships)
          .filter((ship): ship is SpaceshipState => !!ship)
          .map((ship) => (
            <Spaceship
              key={ship.id}
              id={ship.id}
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

  if (!currentSystem || userLoadingFromHook) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white">Loading system data or user...</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 75 }}
      style={{ background: "#111119" }}
      shadows
    >
      <SceneContent
        currentUserIdFromHook={currentUserIdFromHook}
        userLoadingFromHook={userLoadingFromHook}
      />
    </Canvas>
  );
};

export default SolarSystem3DCanvas;
