"use client";

import {
  Sphere,
  MeshDistortMaterial,
  Html,
  OrbitControls,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { PlanetData, StarData } from "@/lib/domain";
import React, { useRef, Suspense } from "react";
import * as THREE from "three";
import { useSolarSystemStore } from "@/lib/store/useSolarSystemStore";
import { SunShaderMaterial } from "@/components/SunSurfaceMaterial";
import Starfield from "@/components/Starfield";

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

const SolarSystem3DCanvas = () => {
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
      camera={{ position: [0, 30, 55], fov: 50 }}
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
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
};

export default SolarSystem3DCanvas;
