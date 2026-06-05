import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Physics, RapierRigidBody } from "@react-three/rapier";
import { nanoid } from "nanoid";
import { useRef, createRef } from "react";

import { SYMBOLS } from "@/domain";
import {
  useEventSource,
  useInputThrottle,
  usePhysicsSimulation,
  usePlanetData,
  useEyePositionReporting,
} from "@/hooks";
import { usePhysicsStore } from "@/stores/physicsStore";
import { useSymbolStore } from "@/stores/symbolStore";
import { Eyes } from "@components/Eyes";
import { Planet } from "@components/Planet";

import type { SymbolState } from "@/stores/symbolStore";

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

// Ambient fill, shared by the main scene and the loading fallback.
const AMBIENT_INTENSITY = 0.08;

const CanvasContent = ({ myId }: { myId: string }) => {
  const { camera } = useThree();
  useEyePositionReporting(myId, camera);

  return (
    <>
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.05}
          luminanceSmoothing={0.2}
          intensity={0.5}
        />
      </EffectComposer>
      <group>
        <ambientLight intensity={AMBIENT_INTENSITY} />
        <Eyes myId={myId} />
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
      </group>
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        zoomSpeed={0.4}
        minDistance={40}
        maxDistance={400}
      />
    </>
  );
};

const Scene = () => {
  const planets = usePlanetData();
  const planetRefs = useRef<RigidBodyRef[]>([]);
  const myId = useRef<string>("");
  if (!myId.current) myId.current = nanoid(6);

  const setLastInput = useSymbolStore((s: SymbolState) => s.setLastInput);
  const disableGravityTemporarily = usePhysicsStore(
    (s) => s.disableGravityTemporarily,
  );

  useEventSource(myId);
  useInputThrottle(myId);
  usePhysicsSimulation(planets, planetRefs);

  const randomEyePos = (): [number, number, number] => {
    const r = 80 + Math.random() * 80;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    return [x, y, z];
  };

  if (planets.length === 0) {
    return (
      <Canvas
        camera={{ position: [0, 0, 120], near: 0.1, far: 2000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={AMBIENT_INTENSITY} />
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="gray" />
        </mesh>
      </Canvas>
    );
  }

  return (
    <Canvas
      camera={{ position: randomEyePos() }}
      style={{ width: "100%", height: "100%" }}
      shadows
      onDoubleClick={() => {
        const randomSymbol =
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        setLastInput({ key: randomSymbol });
        disableGravityTemporarily(2000);
      }}
    >
      <CanvasContent myId={myId.current} />
      <Physics gravity={[0, 0, 0]}>
        {planets.map((planet, i) => {
          if (!planetRefs.current[i]) planetRefs.current[i] = createRef();
          return (
            <Planet
              key={planet.id}
              planet={planet}
              planetRef={planetRefs.current[i]}
            />
          );
        })}
      </Physics>
    </Canvas>
  );
};

export default Scene;
