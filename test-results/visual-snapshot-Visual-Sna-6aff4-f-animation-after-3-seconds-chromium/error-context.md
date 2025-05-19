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
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 3 Issue
- button "Collapse issues badge":
  - img
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/3
  - button "next":
    - img "next"
- img
- img
- text: Next.js 15.3.2 Turbopack
- img
- dialog "Console Error":
  - text: Console Error
  - button "Copy Stack Trace":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
    - img
  - paragraph: The result of getSnapshot should be cached to avoid an infinite loop
  - paragraph:
    - img
    - text: src/app/components/useRemoteCameras.ts (33:10) @ useRemoteCameras
    - button "Open in editor":
      - img
  - text: "31 | window.__es.onmessage = (e) => set(JSON.parse(e.data)); 32 | } > 33 | return useCamStore((s) => Object.entries(s.cams)); | ^ 34 | }; 35 |"
  - paragraph: Call Stack 27
  - button "Show 12 ignore-listed frame(s)":
    - text: Show 12 ignore-listed frame(s)
    - img
  - text: useRemoteCameras
  - button:
    - img
  - text: src/app/components/useRemoteCameras.ts (33:10) RemoteEyes
  - button:
    - img
  - text: src/app/components/RemoteEyes.tsx (9:31) RemoteEyes
  - button:
    - img
  - text: src/app/components/RemoteEyes.tsx (8:21) group <anonymous> (0:0) Suspense <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0) x.useMemo <anonymous> (0:0)
- contentinfo:
  - region "Error feedback":
    - paragraph:
      - link "Was this helpful?":
        - /url: https://nextjs.org/telemetry#error-feedback
    - button "Mark as helpful"
    - button "Mark as not helpful"
- 'heading "Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)." [level=2]'
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