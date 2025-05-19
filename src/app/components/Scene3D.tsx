import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useRef, useEffect, createRef, useState } from "react";
import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { RemoteEyes } from "./RemoteEyes";
import { useCameraPublisher } from "./useCameraPublisher";
import { nanoid } from "nanoid";

const G = 1;

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

type Planet = {
  mass: number;
  radius: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  id: string;
  bumpMap: THREE.Texture;
  colorMap: THREE.Texture;
  metalness: number;
  roughness: number;
  hasRing: boolean;
  ringColor: string;
  ringInner: number;
  ringOuter: number;
  moons: {
    radius: number;
    color: string;
    orbitRadius: number;
    orbitSpeed: number;
    phase: number;
  }[];
  atmosphereColor: string;
  atmosphereLayers: {
    color: string;
    opacity: number;
    scale: number;
    additive?: boolean;
  }[];
  geometryType: "sphere" | "lowpoly" | "oblate";
  angularVelocity: [number, number, number];
};

// Helper to blend two colors
const blendColor = (color1: string, color2: string, t: number) => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t).getStyle();
};

const randomColor = () => {
  const colors = [
    "deepskyblue",
    "limegreen",
    "orange",
    "violet",
    "red",
    "yellow",
    "aqua",
    "pink",
    "white",
    "gold",
    "saddlebrown",
    "slateblue",
    "crimson",
    "teal",
    "coral",
    "indigo",
    "khaki",
    "plum",
    "salmon",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Simple seeded random function
const seededRandom = (seed: number) => {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
};

const randomRadius = () => {
  // More extreme power-law: most small, a few huge
  const min = 0.3,
    max = 8,
    alpha = 3.2;
  return Math.pow(
    Math.random() * (Math.pow(max, 1 - alpha) - Math.pow(min, 1 - alpha)) +
      Math.pow(min, 1 - alpha),
    1 / (1 - alpha),
  );
};

const generateBumpMap = (seed: number) => {
  const size = 128;
  const noise2D = createNoise2D(seededRandom(seed));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      // Multi-octave noise for richer features
      let n = 0;
      let amp = 1;
      let freq = 1;
      for (let o = 0; o < 5; o++) {
        n += amp * noise2D(nx * freq * 4, ny * freq * 4);
        amp *= 0.5;
        freq *= 2;
      }
      n = n / 2.5;
      const v = Math.floor((n + 1) * 0.5 * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
};

const generateColorMap = (
  seed: number,
  baseColor: string,
  altColor: string,
) => {
  const size = 128;
  const noise2D = createNoise2D(seededRandom(seed));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const white = document.createElement("canvas");
    white.width = white.height = 1;
    const wctx = white.getContext("2d");
    if (wctx) {
      wctx.fillStyle = "white";
      wctx.fillRect(0, 0, 1, 1);
    }
    return new THREE.CanvasTexture(white);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;
      let n = 0;
      let amp = 1;
      let freq = 1;
      for (let o = 0; o < 5; o++) {
        n += amp * noise2D(nx * freq * 4, ny * freq * 4);
        amp *= 0.5;
        freq *= 2;
      }
      n = n / 2.5;
      let t = (n + 1) * 0.5;
      const band = Math.abs(Math.sin(ny * Math.PI * 6 + seed));
      t = t * 0.7 + band * 0.3;
      const color = blendColor(baseColor, altColor, t);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return new THREE.CanvasTexture(canvas);
};

const getGeometry = (type: "sphere" | "lowpoly" | "oblate", radius: number) => {
  if (type === "lowpoly") return <icosahedronGeometry args={[radius, 1]} />;
  if (type === "oblate") return <sphereGeometry args={[radius, 24, 16]} />;
  return <sphereGeometry args={[radius, 32, 32]} />;
};

const CameraPublisher = ({ id }: { id: string }) => {
  useCameraPublisher(id);
  return null;
};

const Scene3D = () => {
  const [bumpMaps, setBumpMaps] = useState<THREE.Texture[] | null>(null);
  const [planets, setPlanets] = useState<Planet[]>([]);
  const planetRefs = useRef<RigidBodyRef[]>([]);
  const allPlanetRefs = useRef<RigidBodyRef[]>([]);
  const allPlanetMasses = useRef<number[]>([]);
  const myId = useRef(nanoid());

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

  useEffect(() => {
    if (!bumpMaps) return;
    const N = 20;
    const sizeMultiplier = 7;
    const centralRadius = 8.5 + Math.random() * 1.5;
    const planetsArr = [
      (() => {
        const radius = centralRadius * 2;
        const mass = Math.pow(radius, 3) * (8 + Math.random() * 2) * 2;
        const baseColor = "gold";
        const altColor = "white";
        const seed = Math.random() * 10000;
        const bumpMap = bumpMaps[Math.floor(Math.random() * bumpMaps.length)];
        const colorMap = generateColorMap(seed, baseColor, altColor);
        const metalness = 0.7;
        const roughness = 0.2;
        const ringColor = blendColor(baseColor, altColor, 0.8);
        const ringInner = radius * 1.3;
        const ringOuter = ringInner + radius * 0.3;
        const moons: Planet["moons"] = [];
        const atmosphereColor = blendColor(baseColor, "white", 0.7);
        const atmosphereLayers = [
          {
            color: atmosphereColor,
            opacity: 0.5,
            scale: 1.18,
            additive: true,
          },
        ];
        const geometryType = "sphere" as const;
        const angularVelocity: [number, number, number] = [0, 0.1, 0];
        return {
          mass,
          radius,
          position: [0, 0, 0] as [number, number, number],
          velocity: [0, 0, 0] as [number, number, number],
          color: blendColor(baseColor, altColor, 0.7),
          id: "sun",
          bumpMap,
          colorMap,
          metalness,
          roughness,
          hasRing: false,
          ringColor,
          ringInner,
          ringOuter,
          moons,
          atmosphereColor,
          atmosphereLayers,
          geometryType,
          angularVelocity,
        };
      })(),
      ...Array.from({ length: N - 1 }).map(() => {
        const radius = randomRadius() * sizeMultiplier;
        const mass = Math.pow(radius, 3) * (6 + Math.random() * 2);
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.random() * 60 + 20;
        const z = (Math.random() - 0.5) * (Math.random() * 18 + 2);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const vMag = 5 * Math.sqrt((G * 50) / r);
        const vx = -vMag * Math.sin(angle);
        const vy = vMag * Math.cos(angle);
        const vz = (Math.random() - 0.5) * 0.5 * (radius < 1.2 ? 1 : 0.2);
        const seed = Math.random() * 10000;
        const noise2D = createNoise2D(seededRandom(seed));
        const band = Math.abs(noise2D(Math.sin(angle), Math.cos(angle)));
        const baseColor = randomColor();
        const altColor = randomColor();
        const color = blendColor(baseColor, altColor, band * 0.7);
        const bumpMap = bumpMaps[Math.floor(Math.random() * bumpMaps.length)];
        const colorMap = generateColorMap(seed, baseColor, altColor);
        const metalness = Math.random() * 0.5 + 0.1;
        const roughness = Math.random() * 0.5 + 0.3;
        const isLarge = radius > 2.2;
        const hasRing = isLarge ? Math.random() < 0.5 : Math.random() < 0.12;
        const ringColor = blendColor(
          baseColor,
          altColor,
          0.5 + Math.random() * 0.5,
        );
        const ringInner = radius * (1.2 + Math.random() * 0.2);
        const ringOuter = ringInner + radius * (0.2 + Math.random() * 0.3);
        const moonCount = isLarge
          ? Math.floor(Math.random() * 3) + 1
          : Math.random() < 0.12
            ? 1
            : 0;
        const moons = Array.from({ length: moonCount }, (_, mi) => ({
          radius: radius * (0.12 + Math.random() * 0.09),
          color: randomColor(),
          orbitRadius: radius * (2.2 + Math.random() * 1.5 + mi * 0.7),
          orbitSpeed: 0.2 + Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2,
        }));
        const atmosphereColor = blendColor(
          baseColor,
          "white",
          0.5 + Math.random() * 0.3,
        );
        const atmosphereLayers = [
          {
            color: atmosphereColor,
            opacity: 0.18 + Math.random() * 0.12 + (isLarge ? 0.1 : 0),
            scale: 1.08 + Math.random() * 0.04 + (isLarge ? 0.04 : 0),
          },
          {
            color: blendColor(atmosphereColor, "white", 0.5),
            opacity: 0.08 + Math.random() * 0.07 + (isLarge ? 0.05 : 0),
            scale: 1.13 + Math.random() * 0.06 + (isLarge ? 0.05 : 0),
          },
          {
            color: blendColor(atmosphereColor, "aqua", 0.5),
            opacity: 0.04 + Math.random() * 0.05 + (isLarge ? 0.04 : 0),
            scale: 1.18 + Math.random() * 0.08 + (isLarge ? 0.07 : 0),
            additive: true,
          },
        ];
        const geometryType = (
          Math.random() < 0.12
            ? "lowpoly"
            : Math.random() < 0.18
              ? "oblate"
              : "sphere"
        ) as "sphere" | "lowpoly" | "oblate";
        let spinMag = 0.1 + Math.random() * (0.7 / radius);
        spinMag *= 20;
        if (radius > 5) spinMag = Math.min(spinMag, 1.2);
        const spinAxis = new THREE.Vector3(
          Math.random(),
          Math.random(),
          Math.random(),
        ).normalize();
        const angularVelocity = [
          spinAxis.x * spinMag,
          spinAxis.y * spinMag,
          spinAxis.z * spinMag,
        ] as [number, number, number];
        return {
          mass,
          radius,
          position: [x, y, z] as [number, number, number],
          velocity: [vx, vy, vz] as [number, number, number],
          color,
          id: Math.random().toString(36).slice(2),
          bumpMap,
          colorMap,
          metalness,
          roughness,
          hasRing,
          ringColor,
          ringInner,
          ringOuter,
          moons,
          atmosphereColor,
          atmosphereLayers,
          geometryType,
          angularVelocity,
        };
      }),
    ];
    setPlanets(planetsArr);
  }, [bumpMaps]);

  useEffect(() => {
    let frame: number;
    const step = () => {
      for (let i = 0; i < planetRefs.current.length; i++) {
        const ref = planetRefs.current[i];
        if (!ref?.current || typeof ref.current.translation !== "function")
          continue;
        const planetPos = ref.current.translation();
        if (!planetPos) continue;
        let fx = 0,
          fy = 0,
          fz = 0;
        for (let j = 0; j < planetRefs.current.length; j++) {
          if (i === j) continue;
          const otherRef = planetRefs.current[j];
          if (
            !otherRef?.current ||
            typeof otherRef.current.translation !== "function"
          )
            continue;
          const otherPos = otherRef.current.translation();
          if (!otherPos) continue;
          const dx = otherPos.x - planetPos.x;
          const dy = otherPos.y - planetPos.y;
          const dz = otherPos.z - planetPos.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          const dist = Math.sqrt(distSq);
          const planetRadius = planets[i].radius;
          if (dist < planetRadius * 2) continue;
          const forceMag = (G * planets[j].mass * planets[i].mass) / distSq;
          fx += (dx / dist) * forceMag;
          fy += (dy / dist) * forceMag;
          fz += (dz / dist) * forceMag;
        }
        ref.current.applyImpulse(
          { x: fx * 0.016, y: fy * 0.016, z: fz * 0.016 },
          true,
        );
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [planets]);

  if (!bumpMaps || planets.length === 0) {
    return (
      <Canvas
        camera={{ position: [0, 0, 120] }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={0.2} />
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="gray" />
        </mesh>
      </Canvas>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 120] }}
      style={{ width: "100%", height: "100%" }}
      shadows
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
            if (!allPlanetRefs.current[i])
              allPlanetRefs.current[i] = createRef();
            allPlanetMasses.current[i] = planet.mass;
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
                type="dynamic"
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
                    planet.moons?.map((moon, mi) => (
                      <Moon key={mi} moon={moon} />
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
        onStart={() => {}}
        onEnd={() => {}}
      />
    </Canvas>
  );
};

const Moon = ({ moon }: { moon: Planet["moons"][0] }) => {
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => {
    let frame: number;
    const animate = () => {
      if (ref.current) {
        const t = performance.now() * 0.0002;
        const angle = t * moon.orbitSpeed + moon.phase;
        ref.current.position.x = Math.cos(angle) * moon.orbitRadius;
        ref.current.position.y = Math.sin(angle) * moon.orbitRadius;
        ref.current.position.z = 0;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [moon]);
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[moon.radius, 16, 16]} />
      <meshStandardMaterial
        color={moon.color}
        metalness={0.3}
        roughness={0.7}
      />
    </mesh>
  );
};

export default Scene3D;
