import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Physics, RapierRigidBody } from "@react-three/rapier";
import { nanoid } from "nanoid";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

import { useEventSource } from "@/hooks/useEventSource";
import { useInputThrottle } from "@/hooks/useInputThrottle";
import { usePhysicsSimulation } from "@/hooks/usePhysicsSimulation";
import { usePlanetData } from "@/hooks/usePlanetData";
import { SYMBOLS } from "@/lib/domain/keyboard";
import { useKeyboardStore } from "@/lib/store/keyboardStore";
import { generateBumpMap } from "@/lib/utils";
import { CameraPublisher } from "@components/CameraPublisher";
import { PlanetarySystem } from "@components/PlanetarySystem";
import { RemoteEyes } from "@components/RemoteEyes";

import type { State as KeyboardState } from "@/lib/store/keyboardStore";

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

const Scene3D = () => {
  const [bumpMaps, setBumpMaps] = useState<THREE.Texture[] | null>(null);
  const planets = usePlanetData(bumpMaps);
  const planetRefs = useRef<RigidBodyRef[]>([]);
  const myId = useRef(nanoid(6));

  const setLastInput = useKeyboardStore((s: KeyboardState) => s.setLastInput);

  useEventSource(myId);
  useInputThrottle(myId);
  usePhysicsSimulation(planets, planetRefs);

  useEffect(() => {
    const maps = [
      generateBumpMap(1),
      generateBumpMap(2),
      generateBumpMap(3),
      generateBumpMap(4),
      generateBumpMap(5),
    ].filter(Boolean) as THREE.Texture[];
    setBumpMaps(maps);
  }, []);

  const randomCameraPos = () => {
    const r = 80 + Math.random() * 80;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    return [x, y, z] as [number, number, number];
  };

  if (!bumpMaps || planets.length === 0) {
    return (
      <Canvas
        camera={{ position: [0, 0, 120] }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={0.08} />
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="gray" />
        </mesh>
      </Canvas>
    );
  }

  return (
    <Canvas
      camera={{ position: randomCameraPos() }}
      style={{ width: "100%", height: "100%" }}
      shadows
      onDoubleClick={() => {
        const randomSymbol =
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        setLastInput({ key: randomSymbol });
      }}
    >
      <CameraPublisher id={myId.current} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.25}
          luminanceSmoothing={0.8}
          intensity={0.35}
        />
      </EffectComposer>
      <group>
        <ambientLight intensity={0.08} />
        <RemoteEyes myId={myId.current} />
        <directionalLight
          position={[100, 100, 100]}
          intensity={6}
          color={"#fffbe6"}
          castShadow
          shadow-mapSize-width={8192}
          shadow-mapSize-height={8192}
          shadow-bias={-0.001}
          shadow-camera-near={1}
          shadow-camera-far={2000}
          shadow-camera-left={-1000}
          shadow-camera-right={1000}
          shadow-camera-top={1000}
          shadow-camera-bottom={-1000}
          target-position={[0, 0, 0]}
        />
        <Physics gravity={[0, 0, 0]}>
          <PlanetarySystem planets={planets} planetRefs={planetRefs} />
        </Physics>
      </group>
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        zoomSpeed={0.4}
        minDistance={40}
        maxDistance={400}
        onStart={() => {}}
        onEnd={() => {}}
      />
    </Canvas>
  );
};

export default Scene3D;
