# CLAUDE.md

Read **[AGENTS.md](AGENTS.md)** first — it is the source of truth for this repo (architecture, commands, conventions, and known constraints).

Quick reminders:

- Work on `main` and commit directly. Stage only files relevant to the change.
- Run `npm run verify` before committing; `npm run check` for the full gate (adds Playwright e2e). CI runs `verify` + `test:run`, then deploys to Cloudflare.
- Multiplayer state lives in a single global **Durable Object** (`EventsChannel`); the app is otherwise a static export. `/api/events` only runs under `wrangler dev` (`npm run preview`), not `next dev`. Read the Gotchas in AGENTS.md before touching the Worker, the DO, or deploy config.
