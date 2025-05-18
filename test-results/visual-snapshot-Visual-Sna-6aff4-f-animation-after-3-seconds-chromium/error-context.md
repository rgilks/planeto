# Test info

- Name: Visual Snapshots >> captures image of animation after 3 seconds
- Location: /Users/robertgilks/Source/planeto/tests/visual-snapshot.spec.ts:4:7

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('canvas')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('canvas')

    at /Users/robertgilks/Source/planeto/tests/visual-snapshot.spec.ts:15:26
```

# Page snapshot

```yaml
- main
- alert
- button "Open Next.js Dev Tools":
  - img
```

# Test source

```ts
   1 | import { test, expect } from "@playwright/test";
   2 |
   3 | test.describe("Visual Snapshots", () => {
   4 |   test("captures image of animation after 3 seconds", async ({ page }) => {
   5 |     await page.goto("/");
   6 |
   7 |     await page.waitForTimeout(3000);
   8 |
   9 |     await page.screenshot({
  10 |       path: "screenshots/solarsystem-snapshot.png",
  11 |       fullPage: true,
  12 |     });
  13 |
  14 |     const canvas = page.locator("canvas");
> 15 |     await expect(canvas).toBeVisible();
     |                          ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  16 |   });
  17 | });
  18 |
```