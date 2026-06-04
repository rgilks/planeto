import { test, expect } from "@playwright/test";

// Exercises the validation (Zod, src/domain/event.ts) on the /api/events POST
// path, served by the EventsChannel Durable Object. Runs against the production
// static build under `wrangler dev`, so it confirms malformed wire payloads are
// rejected end-to-end rather than only in unit tests.

const API_ENDPOINT = "/api/events";

const rejected: ReadonlyArray<[name: string, payload: unknown]> = [
  ["empty payload", {}],
  ["missing type", { id: "test", key: "g" }],
  ["unknown type", { type: "invalidType", id: "test" }],
  ["symbol missing id", { type: "symbol", key: "g" }],
  ["symbol missing key", { type: "symbol", id: "test" }],
  ["eye missing id", { type: "eyeUpdate", p: [1, 2, 3], t: Date.now() }],
  ["eye missing p", { type: "eyeUpdate", id: "test", t: Date.now() }],
  [
    "eye p not an array",
    { type: "eyeUpdate", id: "test", p: "x", t: Date.now() },
  ],
  [
    "eye p wrong length",
    { type: "eyeUpdate", id: "test", p: [1, 2], t: Date.now() },
  ],
  [
    "eye p non-number element",
    { type: "eyeUpdate", id: "test", p: [1, "a", 3], t: Date.now() },
  ],
  ["eye missing t", { type: "eyeUpdate", id: "test", p: [1, 2, 3] }],
];

const accepted: ReadonlyArray<[name: string, payload: unknown]> = [
  ["symbol", { type: "symbol", id: "test-valid", key: "g" }],
  [
    "eye",
    { type: "eyeUpdate", id: "test-valid-eye", p: [1, 2, 3], t: Date.now() },
  ],
];

test.describe("POST /api/events validation", () => {
  for (const [name, payload] of rejected) {
    test(`rejects ${name} with 400`, async ({ request }) => {
      const response = await request.post(API_ENDPOINT, { data: payload });
      expect(response.status()).toBe(400);
    });
  }

  for (const [name, payload] of accepted) {
    test(`accepts valid ${name} event`, async ({ request }) => {
      const response = await request.post(API_ENDPOINT, { data: payload });
      expect(response.ok()).toBeTruthy();
    });
  }
});
