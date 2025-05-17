import { test, expect } from "@playwright/test";

test.describe("Visual Snapshots", () => {
  test("captures solar system homepage", async ({ page }) => {
    await page.goto("/");

    // Ensure the page is loaded, perhaps wait for a specific element
    // that indicates the 3D scene is ready if you have one.
    // For now, we'll just wait for a small fixed amount of time.
    await page.waitForTimeout(2000); // Wait 2 seconds for rendering

    await page.screenshot({
      path: "screenshots/solarsystem-snapshot.png",
      fullPage: true,
    });

    // You could add assertions here if needed, e.g., to check for the canvas
    const canvas = await page.locator("canvas");
    await expect(canvas).toBeVisible();
  });
});
