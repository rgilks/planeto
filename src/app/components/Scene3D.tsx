import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useEffect, createRef, useState } from "react";
import {
  Physics,
  RigidBody,
  useRapier,
  RapierRigidBody,
} from "@react-three/rapier";

const G = 1;

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
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const velocityMultiplier = 0.7;

const generateRandomPlanets = (count: number) => {
  const numLarge = 10;
  const numSmall = count - numLarge;
  const largePlanets = Array.from({ length: numLarge }, () => {
    const mass = Math.random() * 8 + 8;
    const radius = Math.random() * 0.7 + 0.7;
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * 10 + 8;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const z = (Math.random() - 0.5) * 2;
    const vMag = velocityMultiplier * Math.sqrt((G * 50) / r);
    const vx = -vMag * Math.sin(angle);
    const vy = vMag * Math.cos(angle);
    const vz = 0;
    return {
      mass,
      radius,
      position: [x, y, z] as [number, number, number],
      velocity: [vx, vy, vz] as [number, number, number],
      color: randomColor(),
    };
  });
  const smallPlanets = Array.from({ length: numSmall }, () => {
    const mass = Math.random() * 0.7 + 0.1;
    const radius = Math.random() * 0.12 + 0.08;
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * 10 + 8;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const z = (Math.random() - 0.5) * 2;
    const vMag = velocityMultiplier * Math.sqrt((G * 50) / r);
    const vx = -vMag * Math.sin(angle);
    const vy = vMag * Math.cos(angle);
    const vz = 0;
    return {
      mass,
      radius,
      position: [x, y, z] as [number, number, number],
      velocity: [vx, vy, vz] as [number, number, number],
      color: randomColor(),
    };
  });
  const allPlanets = largePlanets.concat(smallPlanets);
  for (let i = allPlanets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPlanets[i], allPlanets[j]] = [allPlanets[j], allPlanets[i]];
  }
  return allPlanets;
};

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

const Gravity = ({
  planetRef,
  planetMass,
  planetRadius,
  allPlanetRefs,
  allPlanetMasses,
  planetIndex,
}: {
  planetRef: RigidBodyRef;
  planetMass: number;
  planetRadius: number;
  allPlanetRefs: RigidBodyRef[];
  allPlanetMasses: number[];
  planetIndex: number;
}) => {
  useRapier();
  useEffect(() => {
    let frame: number;
    const step = () => {
      if (!planetRef.current) return;
      const planetPos = planetRef.current.translation();
      let fx = 0,
        fy = 0,
        fz = 0;
      for (let j = 0; j < allPlanetRefs.length; j++) {
        if (j === planetIndex) continue;
        const otherRef = allPlanetRefs[j];
        const otherMass = allPlanetMasses[j];
        if (!otherRef.current) continue;
        const otherPos = otherRef.current.translation();
        const dx = otherPos.x - planetPos.x;
        const dy = otherPos.y - planetPos.y;
        const dz = otherPos.z - planetPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        if (dist < planetRadius * 2) continue;
        const forceMag = (G * otherMass * planetMass) / distSq;
        fx += (dx / dist) * forceMag;
        fy += (dy / dist) * forceMag;
        fz += (dz / dist) * forceMag;
      }
      planetRef.current.applyImpulse(
        { x: fx * 0.016, y: fy * 0.016, z: fz * 0.016 },
        true,
      );
      // Clamp velocity
      const maxVel = 10;
      const v = planetRef.current.linvel();
      const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      if (speed > maxVel) {
        const scale = maxVel / speed;
        planetRef.current.setLinvel(
          {
            x: v.x * scale,
            y: v.y * scale,
            z: v.z * scale,
          },
          true,
        );
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [
    planetRef,
    planetMass,
    planetRadius,
    allPlanetRefs,
    allPlanetMasses,
    planetIndex,
  ]);
  return null;
};

const CameraAnimator = ({ trigger }: { trigger: number }) => {
  const { camera } = useThree();
  const animRef = useRef<number | null>(null);
  const target = { x: 0, y: 0, z: 30 };

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      camera.position.lerp(target, 0.08);
      camera.lookAt(0, 0, 0);
      if (frame < 40) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        camera.position.set(target.x, target.y, target.z);
        camera.lookAt(0, 0, 0);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [trigger]);
  return null;
};

const Scene3D = () => {
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const planets = useMemo(() => generateRandomPlanets(100), []);
  const planetRefs = useRef<RigidBodyRef[]>([]);
  const allPlanetRefs = useRef<RigidBodyRef[]>([]);
  const allPlanetMasses = useRef<number[]>([]);

  useEffect(() => {
    const handleSpace = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const n = planetRefs.current.length;
        if (n === 0) return;
        const idx = Math.floor(Math.random() * n);
        const ref = planetRefs.current[idx];
        if (!ref?.current) return;
        const pos = ref.current.translation();
        for (let i = 0; i < planetRefs.current.length; i++) {
          const p = planetRefs.current[i]?.current;
          if (p) {
            const cur = p.translation();
            p.setTranslation(
              {
                x: cur.x - pos.x,
                y: cur.y - pos.y,
                z: cur.z - pos.z,
              },
              true,
            );
          }
        }
        setCameraTrigger((t) => t + 1);
      }
    };
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 30] }}
      style={{ width: "100%", height: "100%" }}
    >
      <CameraAnimator trigger={cameraTrigger} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Physics gravity={[0, 0, 0]}>
        {planets.map((planet, i) => {
          if (!planetRefs.current[i]) planetRefs.current[i] = createRef();
          if (!allPlanetRefs.current[i]) allPlanetRefs.current[i] = createRef();
          allPlanetMasses.current[i] = planet.mass;
          return (
            <RigidBody
              key={i}
              ref={planetRefs.current[i]}
              position={planet.position}
              mass={planet.mass}
              type="dynamic"
              colliders="ball"
              linearVelocity={planet.velocity}
            >
              <mesh>
                <sphereGeometry args={[planet.radius, 32, 32]} />
                <meshStandardMaterial color={planet.color} />
              </mesh>
            </RigidBody>
          );
        })}
        {planets.map((planet, i) => (
          <Gravity
            key={i}
            planetRef={planetRefs.current[i]}
            planetMass={planet.mass}
            planetRadius={planet.radius}
            allPlanetRefs={planetRefs.current}
            allPlanetMasses={allPlanetMasses.current}
            planetIndex={i}
          />
        ))}
      </Physics>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
};

export default Scene3D;
