"use client";
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

const INTERVAL_MS = 1000;
const roundVec3 = (v: [number, number, number]): [number, number, number] =>
  v.map((n) => Math.round(n * 100) / 100) as [number, number, number];

const VEC3_EPSILON = 0.001; // Epsilon for comparing vector components

const areVec3sEqual = (
  a: [number, number, number] | undefined,
  b: [number, number, number],
): boolean => {
  if (!a) return false;
  return (
    Math.abs(a[0] - b[0]) < VEC3_EPSILON &&
    Math.abs(a[1] - b[1]) < VEC3_EPSILON &&
    Math.abs(a[2] - b[2]) < VEC3_EPSILON
  );
};

export const useCameraPublisher = (id: string) => {
  const { camera } = useThree();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPositionRef = useRef<[number, number, number] | undefined>(
    undefined,
  );

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const currentPositionRaw: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      const currentPositionRounded = roundVec3(currentPositionRaw);

      // Only send if the rounded position has changed
      if (!areVec3sEqual(lastSentPositionRef.current, currentPositionRounded)) {
        const payload = {
          id,
          p: currentPositionRounded,
        };
        const ok = navigator.sendBeacon?.(
          "/api/camera",
          JSON.stringify(payload),
        );
        if (ok === false) {
          console.warn(
            `sendBeacon for position update failed for id: ${id}, skipping update`,
          );
        }
        lastSentPositionRef.current = currentPositionRounded;
      } else {
        // Position hasn't changed significantly.
        // Optionally, send a "ping" to keep the camera alive on the server
        // This ping ensures the timestamp 't' is updated in sseStore.
        // We should also rate-limit these pings if we add them.
        // For now, we rely on purgeStale to remove idle cameras.
        // If a camera becomes active again, it will send its position.
        // To send a ping:
        /*
        const pingPayload = { id };
        const ok = navigator.sendBeacon?.("/api/camera", JSON.stringify(pingPayload));
        if (ok === false) {
          console.warn(`sendBeacon for ping failed for id: ${id}`);
        }
        */
      }
    }, INTERVAL_MS);

    // Send initial position once on mount
    const initialPositionRaw: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const initialPositionRounded = roundVec3(initialPositionRaw);
    const initialPayload = {
      id,
      p: initialPositionRounded,
    };
    navigator.sendBeacon?.("/api/camera", JSON.stringify(initialPayload));
    lastSentPositionRef.current = initialPositionRounded;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Optionally, send a final "disconnect" or "cleanup" message
      // For example, to explicitly remove the camera from the server:
      // navigator.sendBeacon?.("/api/camera/disconnect", JSON.stringify({ id }));
    };
  }, [id, camera]); // Keep camera in dependencies if its instance can change
};
