import { test, expect } from "@playwright/test";

test.describe("Visual Snapshots", () => {
  // Smoke-tests that the scene renders to a <canvas>, and as a side effect
  // refreshes screenshots/loaded.png — the tracked README hero image, so the
  // path must stay put. The 3s wait lets the procedural scene settle first.
  test("renders the scene to a canvas and refreshes the README screenshot", async ({
    page,
  }) => {
    await page.goto("/");

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "screenshots/loaded.png",
      fullPage: true,
    });

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});
