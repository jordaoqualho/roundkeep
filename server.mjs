import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd(),
  production = process.env.NODE_ENV === "production";
const vite = production
  ? null
  : await (
      await import("vite")
    ).createServer({ server: { middlewareMode: true }, appType: "spa" });
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "")) {
      res.writeHead(403);
      res.end("Local access only");
      return;
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (url.pathname.startsWith("/private-data/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    if (url.pathname === "/api/bootstrap") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      try {
        res.end(
          await readFile(
            path.join(root, "private-data/improved-initiative.json"),
          ),
        );
      } catch {
        res.end("{}");
      }
      return;
    }
    if (url.pathname === "/api/health") {
      res.setHeader("Content-Type", "application/json");
      res.end('{"ok":true}');
      return;
    }
    if (!production) {
      vite.middlewares(req, res);
      return;
    }
    let filename = path.resolve(
      root,
      "dist",
      "." + decodeURIComponent(url.pathname),
    );
    if (!filename.startsWith(path.join(root, "dist") + path.sep)) {
      filename = path.join(root, "dist/index.html");
    }
    try {
      if (!(await stat(filename)).isFile()) throw new Error();
    } catch {
      if (path.extname(url.pathname)) {
        res.writeHead(404);
        res.end();
        return;
      }
      filename = path.join(root, "dist/index.html");
    }
    const data = await readFile(filename),
      etag =
        '"' +
        createHash("sha256").update(data).digest("hex").slice(0, 24) +
        '"';
    res.setHeader("ETag", etag);
    res.setHeader(
      "Content-Type",
      mime[path.extname(filename)] || "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      url.pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }
    res.end(data);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end("Falha ao carregar recurso");
  }
});
server.listen(Number(process.env.PORT || 5173), "127.0.0.1", () =>
  console.log("RoundKeep → http://localhost:" + (process.env.PORT || 5173)),
);
