"use client";

import { useRef, useEffect } from "react";
import { useSolarSystemStore } from "@/lib/store/useSolarSystemStore";
import type { SolarSystemData } from "@/lib/domain";

interface StoreInitializerProps {
  initialSystem: SolarSystemData;
}

const StoreInitializer = ({ initialSystem }: StoreInitializerProps) => {
  const initialized = useRef(false);
  const setCurrentSystem = useSolarSystemStore(
    (state) => state.setCurrentSystem,
  );

  useEffect(() => {
    if (!initialized.current) {
      setCurrentSystem(initialSystem);
      initialized.current = true;
    }
  }, [initialSystem, setCurrentSystem]);

  return null; // This component doesn't render anything
};

export default StoreInitializer;
