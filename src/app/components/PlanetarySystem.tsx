import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { createRef } from "react";
import * as THREE from "three";

import { Moon as MoonComponent } from "./Moon";
import { getGeometry } from "./utils/geometryUtils";

import type { Planet } from "../../lib/domainTypes/planet";

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

interface PlanetarySystemProps {
  planets: Planet[];
  planetRefs: React.MutableRefObject<RigidBodyRef[]>;
}

export const PlanetarySystem = ({
  planets,
  planetRefs,
}: PlanetarySystemProps) => {
  return (
    <>
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
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
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
    </>
  );
};
