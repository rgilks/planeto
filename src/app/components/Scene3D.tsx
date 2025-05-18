import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const Scene3D = () => (
  <Canvas
    camera={{ position: [0, 0, 5] }}
    style={{ width: "100%", height: "100%" }}
  >
    <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} />
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
    <OrbitControls enablePan={false} />
  </Canvas>
);

export default Scene3D;
