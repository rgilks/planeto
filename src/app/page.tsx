"use client";

import Scene3D from "./components/Scene3D";
import KeyboardDisplay from "./components/KeyboardDisplay";
import { useEffect } from "react";
import { useKeyboardStore } from "../lib/store/keyboardStore";

const KeyboardHandler = ({ children }: { children: React.ReactNode }) => {
  const setLastInput = useKeyboardStore((s) => s.setLastInput);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Ignore key repeats
      setLastInput({ key: e.key });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLastInput]);

  return <>{children}</>;
};

const HomePage = () => {
  return (
    <KeyboardHandler>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111119]">
        <div className="w-full h-screen">
          <Scene3D />
        </div>
      </main>
      <KeyboardDisplay />
    </KeyboardHandler>
  );
};

export default HomePage;
