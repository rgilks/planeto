import { RapierRigidBody } from "@react-three/rapier";
import { createRef } from "react";

import { Planet } from "@components/Planet";

import type { Planet as PlanetType } from "@/domain";

type RigidBodyRef = React.RefObject<RapierRigidBody | null>;

interface PlanetarySystemProps {
  planets: PlanetType[];
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
        return (
          <Planet
            key={planet.id}
            planet={planet}
            planetRef={planetRefs.current[i]}
          />
        );
      })}
    </>
  );
};
