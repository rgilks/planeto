import { test, expect, Page } from "@playwright/test";

// Exercises the /api/events SSE endpoint (backed by the EventsChannel Durable
// Object) directly over the wire — independent of the client app's internal
// stores — so these run against the production static build served by
// `wrangler dev`.

// Open an EventSource on the page and resolve with the first event whose JSON
// has `field === value`, or null on timeout.
const firstMatchingEvent = (
  page: Page,
  field: string,
  value: string,
  timeout = 10_000,
) =>
  page.evaluate(
    ({ field, value, timeout }) =>
      new Promise<Record<string, unknown> | null>((resolve) => {
        const es = new EventSource("/api/events");
        const timer = setTimeout(() => {
          es.close();
          resolve(null);
        }, timeout);
        es.onmessage = (e) => {
          // The DO only emits JSON `data:` frames (keepalives are SSE comments,
          // which never trigger onmessage), so this parse is always safe.
          const data = JSON.parse(e.data) as Record<string, unknown>;
          if (data[field] === value) {
            clearTimeout(timer);
            es.close();
            resolve(data);
          }
        };
      }),
    { field, value, timeout },
  );

test.describe("SSE event fan-out via /api/events", () => {
  test("fans out eye updates to a connected subscriber", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Planeto/);

    const received = firstMatchingEvent(page, "id", "wire-eye");
    await page.waitForTimeout(800); // let the EventSource register with the DO

    const post = await request.post("/api/events", {
      data: {
        type: "eyeUpdate",
        id: "wire-eye",
        p: [10, 20, 30],
        t: Date.now(),
      },
    });
    expect(post.ok()).toBeTruthy();

    const event = (await received) as { type?: string; p?: number[] } | null;
    expect(event?.type).toBe("eyeUpdate");
    expect(event?.p).toEqual([10, 20, 30]);
  });

  test("fans out symbol events to a connected subscriber", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const received = firstMatchingEvent(page, "id", "wire-symbol");
    await page.waitForTimeout(800);

    const post = await request.post("/api/events", {
      data: { type: "symbol", id: "wire-symbol", key: "g" },
    });
    expect(post.ok()).toBeTruthy();

    const event = (await received) as { type?: string; key?: string } | null;
    expect(event?.type).toBe("symbol");
    expect(event?.key).toBe("g");
  });

  test("replays the current eyes to a new subscriber", async ({
    page,
    request,
  }) => {
    // Post an eye BEFORE subscribing; the DO stores it and replays on connect.
    const post = await request.post("/api/events", {
      data: {
        type: "eyeUpdate",
        id: "replay-eye",
        p: [4, 5, 6],
        t: Date.now(),
      },
    });
    expect(post.ok()).toBeTruthy();

    await page.goto("/");
    const event = (await firstMatchingEvent(page, "id", "replay-eye")) as {
      p?: number[];
    } | null;
    expect(event?.p).toEqual([4, 5, 6]);
  });
});
