# Diagrams

Graphviz / DOT sources plus rendered PNGs. The `.dot` files are the source of truth; the PNGs are committed for in-browser viewing on GitHub. Mermaid is used only for small inline diagrams inside Markdown (e.g. the round-trip sequence in [AGENTS.md](../../AGENTS.md)).

## Files

| Diagram         | Source                | Rendered              |
| --------------- | --------------------- | --------------------- |
| System overview | `system-overview.dot` | `system-overview.png` |

## Conventions

Colour coding by domain:

- **Blue** — the browser client (static WebGL app + the realtime stores).
- **Green** — Cloudflare Worker code (static assets + the `/api/events` router).
- **Teal** — the Durable Object (the in-memory room / state).
- **Purple** — shared pure domain modules (`EventSchema`, `eventsCore`) imported by both sides.
- Diamonds — decisions; dashed edges — optional / "used by" relationships.

Font: Avenir. Rendered at 220 DPI with `dot -Tpng:cairo`.

## Render

```
npm run diagrams          # render all .dot files to PNG next to the source
npm run check:diagrams    # verify each .dot renders cleanly and the PNG exists
```

Both scripts need Graphviz on PATH (`brew install graphviz`). The `Architecture diagrams` CI workflow installs Graphviz and runs `check:diagrams` when diagram files change. On a local machine without `dot`, `check:diagrams` skips with a clear message — refresh the PNGs with `npm run diagrams` before committing diagram changes.

To render one manually:

```
dot -Tpng:cairo docs/diagrams/<name>.dot -Gdpi=220 -o docs/diagrams/<name>.png
```
