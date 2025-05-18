import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { StarFieldSchema, Star } from "../../lib/domain/starField";
import { z } from "zod";

const generateStarField = (count: number): z.infer<typeof StarFieldSchema> => ({
  stars: Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
    ],
    color: "#fff",
    size: Math.random() * 0.3 + 0.05,
  })),
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

const Scene3D = () => (
  <Canvas
    camera={{ position: [0, 0, 5] }}
    style={{ width: "100%", height: "100%" }}
  >
    <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} />
    <StarField count={500} />
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
    <OrbitControls enablePan={false} />
  </Canvas>
);

export default Scene3D;
