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
import type { WebGLRenderer } from "three";

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

// Ambient fill, shared by the main scene and the loading fallback.
const AMBIENT_INTENSITY = 0.08;

// Shadow-map resolution: full-fat on desktop, mobile-safe on low-end (an 8192²
// depth map is multiple hundred MB of VRAM and crashes many phone GPUs).
const SHADOW_MAP_DESKTOP = 8192;
const SHADOW_MAP_LOW_END = 2048;

// Detect a touch / low-power device once. The desktop path is the default, so
// anything we cannot positively identify as low-end keeps the full look (a
// normal desktop reports a fine pointer, 8+ cores and > 4 GB, so it never
// degrades). Guarded for SSR / static export: `window`/`matchMedia`/`navigator`
// may be absent at build time, so fall back to the desktop (high-quality) path.
const detectLowEnd = (): boolean => {
  if (typeof window === "undefined") return false;

  // Primary signal: a coarse pointer (phones/tablets) - no reliable hover or
  // double-click, and almost always a weaker GPU.
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  // Secondary signals (both optional in some browsers): genuinely low core or
  // memory counts. These only ever add devices; they cannot rescue a desktop.
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const cores = nav?.hardwareConcurrency;
  const memory = (nav as Navigator & { deviceMemory?: number })?.deviceMemory;
  const lowCores = cores !== undefined && cores <= 4;
  const lowMemory = memory !== undefined && memory <= 4;

  return coarsePointer || lowCores || lowMemory;
};

// Computed once per module load; the result is stable for the session.
const IS_LOW_END = detectLowEnd();

// Context loss (tab backgrounded, GPU reset, driver hiccup - common on mobile)
// otherwise leaves a silent white canvas. Swallow the default so the browser
// keeps the context recoverable, then ask Three to restore it; if restore never
// fires, reload as a last resort.
const handleContextLoss = (gl: WebGLRenderer) => {
  const canvas = gl.domElement;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;

  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      gl.forceContextRestore?.();
      // If the GPU never hands the context back, a reload is the safe fallback.
      reloadTimer = setTimeout(() => window.location.reload(), 3000);
    },
    false,
  );

  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      if (reloadTimer) clearTimeout(reloadTimer);
    },
    false,
  );
};

const CanvasContent = ({ myId }: { myId: string }) => {
  const { camera } = useThree();
  useEyePositionReporting(myId, camera);

  const shadowMapSize = IS_LOW_END ? SHADOW_MAP_LOW_END : SHADOW_MAP_DESKTOP;

  return (
    <>
      {/* Bloom is GPU-heavy; skip the whole post pass on low-end devices. */}
      {!IS_LOW_END && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.05}
            luminanceSmoothing={0.2}
            intensity={0.5}
          />
        </EffectComposer>
      )}
      <group>
        <ambientLight intensity={AMBIENT_INTENSITY} />
        <Eyes myId={myId} />
        <directionalLight
          position={[100, 100, 100]}
          intensity={6}
          color={"#fffbe6"}
          castShadow
          shadow-mapSize-width={shadowMapSize}
          shadow-mapSize-height={shadowMapSize}
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
      onCreated={({ gl }) => handleContextLoss(gl)}
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
