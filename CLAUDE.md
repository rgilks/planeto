# CLAUDE.md

Read **[AGENTS.md](AGENTS.md)** first — it is the source of truth for this repo (architecture, commands, conventions, and known constraints).

Quick reminders:

- Work on `main` and commit directly. Stage only files relevant to the change.
- Run `npm run verify` before committing; `npm run check` for the full gate (adds Playwright e2e). CI runs `verify`, then deploys to Fly.io.
- Multiplayer state is in-memory in a **single** server process — `fly.toml` caps the app to one machine. Read the Gotchas in AGENTS.md before touching the SSE store or deploy config.
