import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { nanoid } from "nanoid";
import { useRef, useEffect, createRef, useState } from "react";
import * as THREE from "three";

import { useCameraPublisher } from "../../hooks/useCameraPublisher";
import { usePhysicsSimulation } from "../../hooks/usePhysicsSimulation";
import { usePlanetData } from "../../hooks/usePlanetData";
import { SYMBOLS } from "../../lib/domain/keyboard";
import { EventSchema } from "../../lib/domainTypes/event";
import { useKeyboardStore } from "../../lib/store/keyboardStore";

import { RemoteEyes } from "./RemoteEyes";
import { Moon as MoonComponent } from "./scene3d/Moon";
import { generateBumpMap, getGeometry } from "./scene3d/utils";

import type { State as KeyboardState } from "../../lib/store/keyboardStore";

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

const CameraPublisher = ({ id }: { id: string }) => {
  useCameraPublisher(id);
  return null;
};

const THROTTLE_MS = 100;

const Scene3D = () => {
  const [bumpMaps, setBumpMaps] = useState<THREE.Texture[] | null>(null);
  const planets = usePlanetData(bumpMaps);
  const planetRefs = useRef<RigidBodyRef[]>([]);
  const myId = useRef(nanoid(6));
  const setRemoteKey = useKeyboardStore((s: KeyboardState) => s.setRemoteKey);
  const lastInput = useKeyboardStore((s: KeyboardState) => s.lastInput);
  const setLastInput = useKeyboardStore((s: KeyboardState) => s.setLastInput);

  const lastSentTimeRef = useRef(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  usePhysicsSimulation(planets, planetRefs);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const rawData = JSON.parse(e.data);
        const parsedEvent = EventSchema.safeParse(rawData);

        if (parsedEvent.success && parsedEvent.data.type === "keyboard") {
          const { id, key } = parsedEvent.data;
          if (id !== myId.current) {
            setRemoteKey(id, key);
          }
        }
      } catch {
        // console.error(
        //   "Error processing SSE message. Data:",
        //   e.data,
        //   "Error:",
        //   error
        // );
      }
    };
    return () => es.close();
  }, [setRemoteKey]);

  useEffect(() => {
    if (!lastInput) return;

    const now = Date.now();
    const timeSinceLastSend = now - lastSentTimeRef.current;
    const currentLastInput = lastInput;

    const sendEvent = () => {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "keyboard",
          id: myId.current,
          key: currentLastInput.key,
        }),
      });
      lastSentTimeRef.current = Date.now();
    };

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    if (timeSinceLastSend >= THROTTLE_MS) {
      sendEvent();
    } else {
      throttleTimeoutRef.current = setTimeout(
        sendEvent,
        THROTTLE_MS - timeSinceLastSend
      );
    }

    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [lastInput]);

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
          {planets.map((planet, i) => {
            if (!planetRefs.current[i]) planetRefs.current[i] = createRef();
            const isSun = planet.id === "sun";
            let curPos = planet.position;
            const ref = planetRefs.current[i];
            if (ref?.current) {
              const p = ref.current.translation();
              curPos = [p.x, p.y, p.z];
            }
            return (
              <RigidBody
                key={planet.id}
                ref={planetRefs.current[i]}
                position={curPos}
                mass={planet.mass}
                type={isSun ? "fixed" : "dynamic"}
                colliders="ball"
                linearVelocity={planet.velocity}
                angularVelocity={planet.angularVelocity}
                angularDamping={0}
              >
                <group>
                  <mesh
                    castShadow={false}
                    receiveShadow={false}
                    scale={isSun ? 1.1 : 1}
                    renderOrder={999}
                    visible={isSun}
                  >
                    {getGeometry(planet.geometryType, planet.radius)}
                    {isSun ? (
                      <meshBasicMaterial
                        color={"#fffbe6"}
                        transparent
                        opacity={0.95}
                      />
                    ) : (
                      <meshStandardMaterial
                        color={"white"}
                        emissive={planet.color}
                        emissiveIntensity={0.08}
                        map={planet.colorMap}
                        bumpMap={planet.bumpMap}
                        bumpScale={3.5}
                        metalness={planet.metalness}
                        roughness={planet.roughness}
                      />
                    )}
                  </mesh>
                  {!isSun &&
                    planet.atmosphereLayers?.map((layer, idx) => (
                      <mesh key={idx} castShadow receiveShadow>
                        <sphereGeometry
                          args={[planet.radius * layer.scale, 32, 32]}
                        />
                        <meshPhysicalMaterial
                          color={layer.color}
                          transparent
                          opacity={layer.opacity * 0.5}
                          transmission={0.7}
                          thickness={0.4}
                          roughness={0.7}
                          metalness={0.08}
                          depthWrite={false}
                          blending={
                            layer.additive
                              ? THREE.AdditiveBlending
                              : THREE.NormalBlending
                          }
                        />
                      </mesh>
                    ))}
                  {!isSun && planet.hasRing && (
                    <mesh
                      rotation={[Math.PI / 2, 0, 0]}
                      castShadow
                      receiveShadow
                    >
                      <ringGeometry
                        args={[planet.ringInner, planet.ringOuter, 64]}
                      />
                      <meshBasicMaterial
                        color={planet.ringColor}
                        transparent
                        opacity={0.38}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                      />
                    </mesh>
                  )}
                  {!isSun &&
                    planet.moons?.map((moonData, mi) => (
                      <MoonComponent key={mi} moon={moonData} />
                    ))}
                </group>
              </RigidBody>
            );
          })}
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
