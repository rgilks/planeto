"use client";

import "@/lib/r3f-extensions"; // Import for side effects (runs extend)
import ClientErrorLogger from "@/components/ClientErrorLogger";

import SolarSystem3DCanvas from "@/components/SolarSystem3D";
import StoreInitializer from "@/components/StoreInitializer";
import { sampleSolarSystem } from "@/lib/domain/sample-data";

const HomePage = () => {
  // The StoreInitializer will set the current system in the store.
  // We can then access it here or in child components if needed.
  // const currentSystem = useSolarSystemStore((state) => state.currentSystem)

  return (
    <>
      <ClientErrorLogger />
      <StoreInitializer initialSystem={sampleSolarSystem} />
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111119]">
        <div className="w-full h-screen">
          <SolarSystem3DCanvas />
        </div>
      </main>
    </>
  );
};

export default HomePage;
