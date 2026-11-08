import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import express from "express";
// Node's built-in env-file parser avoids logging or expanding secret values.
if (existsSync(".env")) process.loadEnvFile(".env");
import { openDatabase, migrate } from "./db";
import { createApp } from "./app";
import { Worker } from "./worker";
if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Production requires DATABASE_URL; local PGlite is for development only.",
    );
  if (!process.env.APP_ORIGIN?.startsWith("https://"))
    throw new Error("Production requires an explicit HTTPS APP_ORIGIN.");
  if (
    Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || "", "base64").length !== 32
  )
    throw new Error(
      "Production requires a 32-byte base64 TOKEN_ENCRYPTION_KEY.",
    );
}
const db = await openDatabase();
await migrate(db);
const worker = new Worker(db);
const app = createApp(db, worker);
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist/client"));
  app.get("/{*path}", (_req, res) =>
    res.sendFile("index.html", { root: "dist/client" }),
  );
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server =
  process.env.TLS_KEY_FILE && process.env.TLS_CERT_FILE
    ? createHttpsServer(
        {
          key: readFileSync(process.env.TLS_KEY_FILE),
          cert: readFileSync(process.env.TLS_CERT_FILE),
        },
        app,
      )
    : createServer(app);
const port = Number(process.env.PORT || 4310);
server.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Changeboard listening at ${process.env.APP_ORIGIN || `http://127.0.0.1:${port}`}`,
  ),
);
worker.start();
async function shutdown() {
  worker.stop();
  server.close();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
