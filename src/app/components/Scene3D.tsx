import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useEffect, createRef } from "react";
import { StarFieldSchema, Star } from "../../lib/domain/starField";
import { z } from "zod";
import {
  Physics,
  RigidBody,
  useRapier,
  RapierRigidBody,
} from "@react-three/rapier";

const generateStarField = (
  count: number,
  minRadius = 80,
  maxRadius = 100,
): z.infer<typeof StarFieldSchema> => ({
  stars: Array.from({ length: count }, () => {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = Math.random() * (maxRadius - minRadius) + minRadius;
    return {
      position: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      color: "#fff",
      size: Math.random() * 0.3 + 0.05,
    };
  }),
});

const StarField = ({ count = 500 }: { count?: number }) => {
  const starField = useMemo(() => generateStarField(count), [count]);

  return (
    <>
      {starField.stars.map((star: Star, i: number) => (
        <mesh key={i} position={star.position}>
          <sphereGeometry args={[star.size, 6, 6]} />
          <meshBasicMaterial color={star.color} />
        </mesh>
      ))}
    </>
  );
};

const G = 1;
const sunMass = 10;
const sunRadius = 1;

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

const velocityMultiplier = 2.8;

const generateRandomPlanets = (count: number) => {
  const G = 1;
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
    const vMag = velocityMultiplier * Math.sqrt((G * sunMass) / r);
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
    const vMag = velocityMultiplier * Math.sqrt((G * sunMass) / r);
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
  sunRef,
  planetRef,
  planetMass,
  planetRadius,
  allPlanetRefs,
  allPlanetMasses,
  planetIndex,
}: {
  sunRef: RigidBodyRef;
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
      if (!sunRef.current || !planetRef.current) return;
      const sunPos = sunRef.current.translation();
      const planetPos = planetRef.current.translation();
      const dx = sunPos.x - planetPos.x;
      const dy = sunPos.y - planetPos.y;
      const dz = sunPos.z - planetPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);
      if (dist < sunRadius + planetRadius) return;
      const forceMag = (G * sunMass * planetMass) / distSq;
      let fx = (dx / dist) * forceMag;
      let fy = (dy / dist) * forceMag;
      let fz = (dz / dist) * forceMag;
      let rfx = 0,
        rfy = 0,
        rfz = 0;
      const boundary = 30;
      const k = 2;
      if (dist > boundary) {
        const restoreMag = k * (dist - boundary);
        rfx = (dx / dist) * restoreMag;
        rfy = (dy / dist) * restoreMag;
        rfz = (dz / dist) * restoreMag;
      }
      // Planet-planet gravity
      for (let j = 0; j < allPlanetRefs.length; j++) {
        if (j === planetIndex) continue;
        const otherRef = allPlanetRefs[j];
        const otherMass = allPlanetMasses[j];
        if (!otherRef.current) continue;
        const otherPos = otherRef.current.translation();
        const pdx = otherPos.x - planetPos.x;
        const pdy = otherPos.y - planetPos.y;
        const pdz = otherPos.z - planetPos.z;
        const pdistSq = pdx * pdx + pdy * pdy + pdz * pdz;
        const pdist = Math.sqrt(pdistSq);
        if (pdist < planetRadius * 2) continue;
        const pForceMag = (G * otherMass * planetMass) / pdistSq;
        fx += (pdx / pdist) * pForceMag;
        fy += (pdy / pdist) * pForceMag;
        fz += (pdz / pdist) * pForceMag;
      }
      planetRef.current.applyImpulse(
        { x: (fx + rfx) * 0.016, y: (fy + rfy) * 0.016, z: (fz + rfz) * 0.016 },
        true,
      );
      sunRef.current.applyImpulse(
        {
          x: -(fx + rfx) * 0.016,
          y: -(fy + rfy) * 0.016,
          z: -(fz + rfz) * 0.016,
        },
        true,
      );
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [
    sunRef,
    planetRef,
    planetMass,
    planetRadius,
    allPlanetRefs,
    allPlanetMasses,
    planetIndex,
  ]);
  return null;
};

const Scene3D = () => {
  const sunRef: RigidBodyRef = useRef(null);
  const planets = useMemo(() => generateRandomPlanets(100), []);
  const planetRefs = useRef<RigidBodyRef[]>([]);
  const allPlanetRefs = useRef<RigidBodyRef[]>([]);
  const allPlanetMasses = useRef<number[]>([]);

  return (
    <Canvas
      camera={{ position: [0, 0, 30] }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <StarField count={500} />
      <Physics gravity={[0, 0, 0]}>
        <RigidBody
          ref={sunRef}
          position={[0, 0, 0]}
          mass={sunMass}
          type="dynamic"
          colliders="ball"
        >
          <mesh>
            <sphereGeometry args={[sunRadius, 32, 32]} />
            <meshStandardMaterial color="yellow" />
          </mesh>
        </RigidBody>
        {planets.map((planet, i) => {
          if (!planetRefs.current[i]) planetRefs.current[i] = createRef();
          if (!allPlanetRefs.current[i]) allPlanetRefs.current[i] = createRef();
          allPlanetMasses.current.push(planet.mass);
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
            sunRef={sunRef}
            planetRef={planetRefs.current[i]}
            planetMass={planet.mass}
            planetRadius={planet.radius}
            allPlanetRefs={allPlanetRefs.current}
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
