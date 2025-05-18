import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useEffect } from "react";
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

const G = 10;
const sunMass = 1000;
const planetMass = 1;
const sunRadius = 1;
const planetRadius = 0.3;
const planetInitialPos: [number, number, number] = [4, 0, 0];
const planetInitialVel: [number, number, number] = [0, 10, 0];

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

const Gravity = ({
  sunRef,
  planetRef,
}: {
  sunRef: RigidBodyRef;
  planetRef: RigidBodyRef;
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
      const fx = (dx / dist) * forceMag;
      const fy = (dy / dist) * forceMag;
      const fz = (dz / dist) * forceMag;
      planetRef.current.applyImpulse(
        { x: fx * 0.016, y: fy * 0.016, z: fz * 0.016 },
        true,
      );
      sunRef.current.applyImpulse(
        { x: -fx * 0.016, y: -fy * 0.016, z: -fz * 0.016 },
        true,
      );
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [sunRef, planetRef]);
  return null;
};

const Scene3D = () => {
  const sunRef: RigidBodyRef = useRef(null);
  const planetRef: RigidBodyRef = useRef(null);

  return (
    <Canvas
      camera={{ position: [0, 0, 10] }}
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
        <RigidBody
          ref={planetRef}
          position={planetInitialPos}
          mass={planetMass}
          type="dynamic"
          colliders="ball"
          linearVelocity={planetInitialVel}
        >
          <mesh>
            <sphereGeometry args={[planetRadius, 32, 32]} />
            <meshStandardMaterial color="deepskyblue" />
          </mesh>
        </RigidBody>
        <Gravity sunRef={sunRef} planetRef={planetRef} />
      </Physics>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
};

export default Scene3D;
