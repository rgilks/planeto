// Pure room-assignment logic for the RoomDirector. Each "room" is one
// EventsChannel Durable Object; capping occupancy per room keeps per-event
// fan-out (and cost) bounded, and overflowing into new rooms lets the app scale
// without one DO being overwhelmed.

// Max concurrent connections per room. Shared by the director (which assigns
// rooms) and each EventsChannel (its own self-cap), so the two agree.
export const ROOM_CAP = 30;

// Safety bound on how many rooms can be opened, so a flood cannot spin up an
// unbounded number of Durable Objects.
export const MAX_ROOMS = 1000;

// Lowest room id (0-based) that still has spare capacity. Scanning from 0 keeps
// the usually-small crowd together in room 0, and the first id past the occupied
// rooms is a fresh (empty) room - so callers "open a new room when full" for
// free, and a freed slot in a lower room is reused first. Returns the last room
// if every room is full (implausible at MAX_ROOMS x ROOM_CAP).
export const pickRoom = (
  counts: Readonly<Record<number, number>>,
  cap: number = ROOM_CAP,
  maxRooms: number = MAX_ROOMS,
): number => {
  for (let room = 0; room < maxRooms; room++) {
    if ((counts[room] ?? 0) < cap) return room;
  }
  return maxRooms - 1;
};
