export const getGeometry = (
  type: "sphere" | "lowpoly" | "oblate",
  radius: number,
): React.ReactNode => {
  if (type === "lowpoly") return <icosahedronGeometry args={[radius, 1]} />;
  if (type === "oblate") return <sphereGeometry args={[radius, 24, 16]} />;
  return <sphereGeometry args={[radius, 32, 32]} />;
};
