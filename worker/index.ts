// Cloudflare Worker entry point. The static Next export in ./out is served by
// the [assets] binding; only /api/events runs the Worker (run_worker_first),
// which forwards it to the single global EventsChannel Durable Object. Anything
// else falls through to static assets.

import { EventsChannel } from "./eventsChannel";

export { EventsChannel };

interface Env {
  EVENTS: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const ROOM = "global";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/events") {
      const stub = env.EVENTS.get(env.EVENTS.idFromName(ROOM));
      if (request.method === "GET") {
        return stub.fetch("https://do/subscribe");
      }
      if (request.method === "POST") {
        const body = await request.text();
        return stub.fetch("https://do/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
      }
      return new Response("method_not_allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
