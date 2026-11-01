import { Hono } from "hono";
import { exerciseRoutes } from "./routes/exercises.ts";

// Separate from index.ts so tests can call routes without starting a server.
export const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));
app.route("/exercises", exerciseRoutes);

app.onError((err, c) => {
  // Log the details here, and never send database errors to the client.
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});
