"use client";

import Scene3D from "./components/Scene3D";

const HomePage = () => {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111119]">
        <div className="w-full h-screen">
          <Scene3D />
        </div>
      </main>
    </>
  );
};

export default HomePage;
