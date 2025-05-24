import { test, expect, Page } from "@playwright/test";

const pollForCondition = async (
  page: Page,
  conditionFn: () => Promise<boolean>,
  timeout = 5000,
  pollInterval = 100,
) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await page.waitForTimeout(pollInterval);
  }
  return false;
};

test.describe("Multi-User Event Synchronization", () => {
  let page1: Page;
  let page2: Page;

  test.beforeEach(async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    await page1.goto("/");
    await page2.goto("/");
    await expect(page1).toHaveTitle(/Planeto/);
    await expect(page2).toHaveTitle(/Planeto/);
  });

  test("synchronizes camera updates between two users", async ({ request }) => {
    const user1CamId = "user1-cam-test";
    const user1CamPos: [number, number, number] = [10, 20, 30];

    // User 1 posts a camera update
    const postData = {
      type: "cameraUpdate",
      id: user1CamId,
      p: user1CamPos,
      t: Date.now(),
    };
    const postResponse = await request.post("/api/events", { data: postData });
    expect(postResponse.ok()).toBeTruthy();

    // User 2 verifies receiving the camera update
    const receivedOnPage2 = await pollForCondition(page2, async () => {
      const camData = await page2.evaluate((id) => {
        // @ts-expect-error - accessing debug store
        const storeState = window.__camStore?.getState();
        return storeState?.cams?.[id];
      }, user1CamId);
      return JSON.stringify(camData?.p) === JSON.stringify(user1CamPos);
    });
    expect(receivedOnPage2).toBe(true);
  });

  test("synchronizes keyboard events between two users", async ({
    request,
  }) => {
    const user1KeyboardId = "user1-key-test";
    const user1Key = "g";

    // User 1 posts a keyboard event
    const keyboardEventData = {
      type: "keyboard",
      id: user1KeyboardId,
      key: user1Key,
    };
    const keyboardPostResponse = await request.post("/api/events", {
      data: keyboardEventData,
    });
    expect(keyboardPostResponse.ok()).toBeTruthy();

    // User 2 verifies receiving the keyboard event
    const keyboardEventReceivedOnPage2 = await pollForCondition(
      page2,
      async () => {
        const keyData = await page2.evaluate((id) => {
          // @ts-expect-error - accessing debug store
          const storeState = window.__keyboardStore?.getState();
          return storeState?.remoteKeys?.[id];
        }, user1KeyboardId);
        return keyData?.key === user1Key;
      },
    );
    expect(keyboardEventReceivedOnPage2).toBe(true);
  });

  test("full client-side keyboard event synchronization", async () => {
    await page1.locator("body").focus(); // Ensure page1 is focused to receive keyboard input
    await page1.keyboard.press("h");

    const clientSideKeyboardEventReceived = await pollForCondition(
      page2,
      async () => {
        const remoteKeys = await page2.evaluate(() => {
          // @ts-expect-error - accessing debug store
          const storeState = window.__keyboardStore?.getState();
          return storeState?.remoteKeys as
            | Record<string, { key: string; ts: number }>
            | undefined;
        });
        return Object.values(remoteKeys || {}).some(
          (entry) => entry.key === "h",
        );
      },
    );
    expect(clientSideKeyboardEventReceived).toBe(true);
  });
});

test("original: has title and receives initial event data", async ({
  page,
  request,
}) => {
  const postData = {
    type: "cameraUpdate",
    id: "test-camera",
    p: [1, 2, 3],
    t: Date.now(),
  };
  const postResponse = await request.post("/api/events", { data: postData });
  expect(postResponse.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page).toHaveTitle(/Planeto/);

  const received = await pollForCondition(
    page,
    async () => {
      const camData = await page.evaluate(() => {
        // @ts-expect-error - accessing debug store
        const storeState = window.__camStore?.getState();
        return storeState?.cams?.["test-camera"];
      });
      return JSON.stringify(camData?.p) === JSON.stringify([1, 2, 3]);
    },
    10000,
  );
  expect(received).toBe(true);
});
