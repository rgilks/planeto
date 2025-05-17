"use client";

import { Sphere, MeshDistortMaterial, Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { PlanetData, StarData } from "@/lib/domain";
import React, { useRef, Suspense } from "react";
import * as THREE from "three";
import { useSolarSystemStore } from "@/lib/store/useSolarSystemStore";

// Sample Data - this would eventually come from the store or props

interface PlanetProps {
  data: PlanetData;
  isMoon?: boolean;
  parentPosition?: THREE.Vector3; // For moons to orbit their planet
}

const Planet = ({
  data,
  isMoon = false,
  parentPosition = new THREE.Vector3(0, 0, 0),
}: PlanetProps) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (meshRef.current && groupRef.current) {
      const elapsedTime = clock.getElapsedTime();
      const angle = (elapsedTime / data.orbitalPeriod) * 2 * Math.PI;

      // Orbital position relative to parent (star or planet)
      const x = data.orbitRadius * Math.cos(angle);
      const z = data.orbitRadius * Math.sin(angle);

      if (isMoon) {
        groupRef.current.position.set(
          parentPosition.x + x,
          parentPosition.y,
          parentPosition.z + z,
        );
      } else {
        groupRef.current.position.set(x, 0, z);
      }
      // Simple self-rotation (optional)
      // meshRef.current.rotation.y += 0.005;
    }
  });

  const planetScale = isMoon ? data.radius * 0.5 : data.radius; // Moons are smaller relative to planets

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
          distort={0.1} // Less distortion for smaller bodies
          speed={1}
          roughness={0.7}
        />
      </Sphere>
      {data.moons &&
        data.moons.map((moon: PlanetData) => (
          <Planet
            key={moon.id}
            data={moon}
            isMoon={true}
            parentPosition={
              meshRef.current?.getWorldPosition(new THREE.Vector3()) ||
              new THREE.Vector3()
            }
          />
        ))}
      <Html distanceFactor={10}>
        <div className="text-white text-xs bg-black bg-opacity-50 px-1 rounded">
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
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[2, 32, 32]} /> {/* Star radius, e.g., 2 units */}
      <meshStandardMaterial
        color="#FFD700"
        emissive="#FFD700"
        emissiveIntensity={2}
      />
      <Html distanceFactor={20}>
        <div className="text-white text-sm bg-black bg-opacity-75 p-1 rounded">
          {data.name} ({data.type})
        </div>
      </Html>
    </mesh>
  );
};

const SolarSystemCanvas = () => {
  const currentSystem = useSolarSystemStore((state) => state.currentSystem);

  if (!currentSystem) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white">Loading system data...</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 20, 35], fov: 50 }}
      style={{ background: "#111119" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.2} />
        <pointLight
          position={[0, 0, 0]}
          intensity={1.5}
          distance={1000}
          color={
            currentSystem.star.type === "G-type main-sequence star"
              ? "#FFF8E7"
              : "#FFFFFF"
          }
        />

        <Star data={currentSystem.star} />
        {currentSystem.star.planets.map((planet: PlanetData) => (
          <Planet key={planet.id} data={planet} />
        ))}
      </Suspense>
      {/* Add OrbitControls if needed for manual camera control */}
      {/* <OrbitControls /> */}
    </Canvas>
  );
};

export default SolarSystemCanvas;
