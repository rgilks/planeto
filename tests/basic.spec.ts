import { test, expect } from "@playwright/test";

test("has title and receives initial event data", async ({ page, request }) => {
  const postData = { id: "testCam", p: [1, 2, 3] };
  const postResponse = await request.post("/api/camera", { data: postData });
  expect(postResponse.ok()).toBeTruthy();

  await page.goto("/");

  await expect(page).toHaveTitle(/Planeto/);

  await expect
    .poll(
      async () => {
        const camData = await page.evaluate(() => {
          // @ts-expect-error - accessing debug store
          const storeState = window.__camStore?.getState();
          return storeState?.cams?.testCam;
        });
        return JSON.stringify(camData?.p) === JSON.stringify([1, 2, 3]);
      },
      { timeout: 5000 },
    )
    .toBe(true);
});
