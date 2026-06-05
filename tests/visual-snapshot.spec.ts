import { test, expect } from "@playwright/test";

test.describe("Visual Snapshots", () => {
  // Smoke-tests that the scene renders to a <canvas>. The screenshot is written
  // to the gitignored test-results/ dir so e2e runs don't dirty the tree; the
  // tracked README hero image (screenshots/loaded.png) is maintained by hand.
  // The 3s wait lets the procedural scene settle first.
  test("renders the scene to a canvas", async ({ page }) => {
    await page.goto("/");

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "test-results/loaded.png",
      fullPage: true,
    });

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});
