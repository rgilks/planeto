import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Physics, RapierRigidBody } from "@react-three/rapier";
import { nanoid } from "nanoid";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

import { SYMBOLS, CameraUpdateType } from "@/domain";
import { useEventSource } from "@/hooks/useEventSource";
import { useInputThrottle } from "@/hooks/useInputThrottle";
import { usePhysicsSimulation } from "@/hooks/usePhysicsSimulation";
import { usePlanetData } from "@/hooks/usePlanetData";
import { generateBumpMap } from "@/lib/utils";
import { useKeyboardStore } from "@/stores/keyboardStore";
import { PlanetarySystem } from "@components/PlanetarySystem";
import { RemoteEyes } from "@components/RemoteEyes";

import type { State as KeyboardState } from "@/stores/keyboardStore";

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;

const roundVec3 = (v: [number, number, number]): [number, number, number] =>
  v.map((n) => Math.round(n * 100) / 100) as [number, number, number];

const VEC3_EPSILON = 0.001;

const areVec3sEqual = (
  a: Readonly<[number, number, number]> | undefined,
  b: Readonly<[number, number, number]>,
): boolean => {
  if (!a) {
    return false;
  }

  for (let i = 0; i < 3; i++) {
    const valA = a[i];
    const valB = b[i];

    if (Number.isNaN(valA) && Number.isNaN(valB)) {
      continue;
    }
    if (Number.isNaN(valA) || Number.isNaN(valB)) {
      return false;
    }
    if (Math.abs(valA - valB) >= VEC3_EPSILON) {
      return false;
    }
  }
  return true;
};

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

const CanvasContent = ({ myId }: { myId: string }) => {
  const { camera } = useThree();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPositionRef = useRef<[number, number, number] | undefined>(
    undefined,
  );
  const forcePositionUpdateCounterRef = useRef(0);

  useEffect(() => {
    const localIntervalMs = 2000;
    const checksPerForcePositionUpdate =
      FORCE_POSITION_UPDATE_INTERVAL_MS / localIntervalMs;

    const initialPositionRaw: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const initialPositionRounded = roundVec3(initialPositionRaw);
    const initialPayload: CameraUpdateType = {
      type: "cameraUpdate",
      id: myId,
      p: initialPositionRounded,
      t: Date.now(),
    };
    navigator.sendBeacon?.("/api/events", JSON.stringify(initialPayload));
    lastSentPositionRef.current = initialPositionRounded;
    forcePositionUpdateCounterRef.current = 0;

    intervalRef.current = setInterval(() => {
      const currentPositionRaw: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      const currentPositionRounded = roundVec3(currentPositionRaw);

      forcePositionUpdateCounterRef.current += 1;

      const positionActuallyChanged = !areVec3sEqual(
        lastSentPositionRef.current,
        currentPositionRounded,
      );
      const isTimeForForcePositionUpdate =
        forcePositionUpdateCounterRef.current >= checksPerForcePositionUpdate;

      if (positionActuallyChanged || isTimeForForcePositionUpdate) {
        const payload: CameraUpdateType = {
          type: "cameraUpdate",
          id: myId,
          p: currentPositionRounded,
          t: Date.now(),
        };
        navigator.sendBeacon?.("/api/events", JSON.stringify(payload));
        lastSentPositionRef.current = currentPositionRounded;
        forcePositionUpdateCounterRef.current = 0;
      }
    }, localIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [camera, myId]);

  return (
    <>
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.25}
          luminanceSmoothing={0.8}
          intensity={0.35}
        />
      </EffectComposer>
      <group>
        <ambientLight intensity={0.08} />
        <RemoteEyes myId={myId} />
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
        onStart={() => {}}
        onEnd={() => {}}
      />
    </>
  );
};

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
      <CanvasContent myId={myId.current} />
      <Physics gravity={[0, 0, 0]}>
        <PlanetarySystem planets={planets} planetRefs={planetRefs} />
      </Physics>
    </Canvas>
  );
};

export default Scene3D;
