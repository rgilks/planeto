import { z } from "zod";

import { CameraUpdateType, EventType, Vec3Schema } from "@/lib/domainTypes";

export type Vec3 = z.infer<typeof Vec3Schema>;

type Writer = { write: (data: string) => void; closed: boolean };

const cameras = new Map<string, CameraUpdateType>();
const subs = new Set<Writer>();

export const setCamera = (id: string, p: Vec3): void => {
  const msg: CameraUpdateType = { type: "cameraUpdate", id, p, t: Date.now() };
  cameras.set(id, msg);
  broadcast(msg);
};

export const broadcast = (msg: EventType): void => {
  const data = `data:${JSON.stringify(msg)}

`;
  for (const w of subs) {
    if (w.closed) {
      subs.delete(w);
      continue;
    }
    try {
      w.write(data);
    } catch (error) {
      console.error(
        `Failed to write to SSE subscriber for event type ${msg?.type ?? "unknown"}. Removing subscriber.`,
        error,
      );
      subs.delete(w);
    }
  }
};

export const subscribe = (w: Writer): void => {
  subs.add(w);
  for (const cam of cameras.values()) {
    try {
      w.write(`data:${JSON.stringify(cam)}

`);
    } catch (error) {
      console.error(
        `Failed to write initial camera data to SSE subscriber. Removing subscriber.`,
        error,
      );
      subs.delete(w);
      break;
    }
  }
};

export const purgeStale = (maxAge = 30000): void => {
  const now = Date.now();
  for (const [id, cam] of cameras) {
    if (now - cam.t > maxAge) cameras.delete(id);
  }
};

export const unsubscribe = (w: Writer): void => {
  subs.delete(w);
};

const PURGE_INTERVAL = 10000;
setInterval(() => {
  purgeStale();
}, PURGE_INTERVAL);
