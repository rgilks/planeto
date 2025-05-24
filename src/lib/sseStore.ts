import { z } from "zod";

import { CameraUpdateType, EventType, Vec3Schema } from "./domainTypes";

export type Vec3 = z.infer<typeof Vec3Schema>;

type Writer = { write: (data: string) => void; closed: boolean };

const cameras = new Map<string, CameraUpdateType>();
const subs = new Set<Writer>();

export const setCamera = (id: string, p: Vec3) => {
  const msg: CameraUpdateType = { type: "cameraUpdate", id, p, t: Date.now() };
  cameras.set(id, msg);
  broadcast(msg);

  const cam = cameras.get(id);
  if (cam) {
    cam.t = Date.now();
    cameras.set(id, cam);
  }
};

export const broadcast = (msg: EventType) => {
  const data = `data:${JSON.stringify(msg)}\n\n`;
  for (const w of subs) {
    if (w.closed) {
      subs.delete(w);
      continue;
    }
    w.write(data);
  }
};

export const subscribe = (w: Writer) => {
  subs.add(w);
  for (const cam of cameras.values()) {
    w.write(`data:${JSON.stringify(cam)}\n\n`);
  }
};

export const purgeStale = (maxAge = 30000) => {
  const now = Date.now();
  for (const [id, cam] of cameras) {
    if (now - cam.t > maxAge) cameras.delete(id);
  }
};

export const unsubscribe = (w: Writer) => {
  subs.delete(w);
};

const PURGE_INTERVAL = 10000;
setInterval(() => {
  purgeStale();
}, PURGE_INTERVAL);
