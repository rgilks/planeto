import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

import { Moon } from "@components/Moon";

import type { Planet as PlanetType } from "@/domain"; // Renamed to avoid conflict with component name

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

interface PlanetProps {
  planet: PlanetType;
  planetRef: RigidBodyRef;
}

const getGeometry = (
  type: "sphere" | "lowpoly" | "oblate",
  radius: number,
): React.ReactNode => {
  if (type === "lowpoly") return <icosahedronGeometry args={[radius, 1]} />;
  if (type === "oblate") return <sphereGeometry args={[radius, 24, 16]} />;
  return <sphereGeometry args={[radius, 32, 32]} />;
};

export const Planet = ({ planet, planetRef }: PlanetProps) => {
  const isSun = planet.id === "sun";
  let curPos = planet.position;

  if (planetRef?.current) {
    const p = planetRef.current.translation();
    curPos = [p.x, p.y, p.z];
  }

  return (
    <RigidBody
      key={planet.id}
      ref={planetRef}
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
            <meshBasicMaterial color={"#fffbe6"} transparent opacity={0.95} />
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
              <sphereGeometry args={[planet.radius * layer.scale, 32, 32]} />
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
                  layer.additive ? THREE.AdditiveBlending : THREE.NormalBlending
                }
              />
            </mesh>
          ))}
        {!isSun && planet.hasRing && (
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <ringGeometry args={[planet.ringInner, planet.ringOuter, 64]} />
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
            <Moon key={mi} moon={moonData} />
          ))}
      </group>
    </RigidBody>
  );
};
