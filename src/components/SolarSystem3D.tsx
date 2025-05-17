"use client";

import {
  Sphere,
  MeshDistortMaterial,
  Html,
  OrbitControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type {
  PlanetData,
  StarData,
  UserId,
  SpaceshipState,
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
      <Html distanceFactor={10} position={[0, planetScale + 0.5, 0]}>
        <div className="text-white text-xs bg-black bg-opacity-50 px-1 rounded whitespace-nowrap">
          {data.name}
        </div>
      </Html>
    </group>
  );
};

interface StarProps {
  data: StarData;
}

const Star = ({ data }: StarProps) => {
  const starRadius = 2;
  const materialRef = useRef<SunShaderMaterial>(null!);
  const { camera } = useThree();

  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.time += delta;
      if (materialRef.current.uniforms["u_cameraPosition"]) {
        materialRef.current.cameraPosition = camera.getWorldPosition(
          new THREE.Vector3(),
        );
      }
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[starRadius, 32, 32]} />
      <sunShaderMaterial ref={materialRef} attach="material" />
      <Html distanceFactor={20} position={[0, starRadius + 0.5, 0]}>
        <div className="text-white text-sm bg-black bg-opacity-75 p-1 rounded whitespace-nowrap">
          {data.name} ({data.type})
        </div>
      </Html>
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

const SolarSystem3DCanvas = () => {
  const currentSystem = useSolarSystemStore((state) => state.currentSystem);
  const { userId: currentUserIdFromHook, isLoading: userLoadingFromHook } =
    useCurrentUser();

  // Select state and actions individually
  const gameState = useGameStore((state) => state.gameState);
  const currentSpaceshipId = useGameStore((state) => state.currentSpaceshipId);
  const isConnected = useGameStore((state) => state.isConnected);
  const gameError = useGameStore((state) => state.error);
  const setCurrentUserId = useGameStore((state) => state.setCurrentUserId);
  const moveMySpaceship = useGameStore((state) => state.moveMySpaceship);

  const connectionAttemptedRef = useRef(false);

  // Log game connection status and spaceship ID for debugging
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
        currentUserIdFromHook,
      );
      setCurrentUserId(currentUserIdFromHook);
      connectionAttemptedRef.current = true; // Mark that connection attempt has been made
    }
  }, [currentUserIdFromHook, userLoadingFromHook, setCurrentUserId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentSpaceshipId || !gameState.spaceships[currentSpaceshipId]) {
        return;
      }
      const currentShip = gameState.spaceships[currentSpaceshipId]!;
      const newPosition = { ...currentShip.position };
      const newRotation = { ...currentShip.rotation };

      const moveSpeed = 0.2;
      const rotateSpeed = 0.05;

      let positionChanged = false;
      let rotationChanged = false;

      switch (event.key) {
        case "ArrowUp":
          newPosition.z -= moveSpeed;
          positionChanged = true;
          break;
        case "ArrowDown":
          newPosition.z += moveSpeed;
          positionChanged = true;
          break;
        case "ArrowLeft":
          newRotation.y += rotateSpeed;
          rotationChanged = true;
          break;
        case "ArrowRight":
          newRotation.y -= rotateSpeed;
          rotationChanged = true;
          break;
        case "w":
          {
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyEuler(
              new THREE.Euler(
                newRotation.x,
                newRotation.y,
                newRotation.z,
                "YXZ",
              ),
            );
            newPosition.x += forward.x * moveSpeed;
            newPosition.y += forward.y * moveSpeed;
            newPosition.z += forward.z * moveSpeed;
            positionChanged = true;
          }
          break;
        case "s":
          {
            const backward = new THREE.Vector3(0, 0, 1);
            backward.applyEuler(
              new THREE.Euler(
                newRotation.x,
                newRotation.y,
                newRotation.z,
                "YXZ",
              ),
            );
            newPosition.x += backward.x * moveSpeed;
            newPosition.y += backward.y * moveSpeed;
            newPosition.z += backward.z * moveSpeed;
            positionChanged = true;
          }
          break;
        case "a":
          newRotation.y += rotateSpeed;
          rotationChanged = true;
          break;
        case "d":
          newRotation.y -= rotateSpeed;
          rotationChanged = true;
          break;
      }

      if (positionChanged || rotationChanged) {
        moveMySpaceship(newPosition, newRotation);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentSpaceshipId, gameState, moveMySpaceship]);

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
    >
      <Starfield />
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <pointLight
          position={[0, 0, 0]}
          intensity={2.5}
          distance={2000}
          color={
            currentSystem.star.type.toLowerCase().includes("g-type")
              ? "#FFF8E7"
              : "#A4D8FF"
          } // Warmer for G-type, cooler for others
        />

        <Star data={currentSystem.star} />
        {currentSystem.star.planets.map((planet: PlanetData) => (
          <Planet key={planet.id} data={planet} />
        ))}
        {Object.values(gameState.spaceships)
          .filter(
            (ship): ship is SpaceshipState =>
              ship !== undefined &&
              ship !== null &&
              typeof ship === "object" &&
              "id" in ship,
          )
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
      <OrbitControls />
    </Canvas>
  );
};

export default SolarSystem3DCanvas;
