import { serve } from "@hono/node-server";
import { app } from "./app.ts";

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`API running on http://localhost:${info.port}`);
});
