import http from "node:http";
import os from "node:os";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Server } from "socket.io";
import { createRooms } from "./src/room.mjs";
import {
  allowSocketRequest,
  isAllowedHost,
  isLoopbackHost,
  isSocketIoPath,
} from "./src/host.mjs";

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

function playerUrls(roomId, port) {
  const hosts = new Set(["127.0.0.1"]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      if ((addr.family === "IPv4" || addr.family === 4) && !addr.internal) {
        hosts.add(addr.address);
      }
    }
  }
  return [...hosts].map((host) => `http://${host}:${port}/p/${roomId}`);
}

const rooms = createRooms();
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!isAllowedHost(req.headers.host)) {
      res.writeHead(403);
      res.end("Local access only");
      return;
    }
    if (isSocketIoPath(url.pathname)) return;
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
      if (!isLoopbackHost(req.headers.host)) {
        res.writeHead(403);
        res.end("Local access only");
        return;
      }
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
    if (url.pathname === "/api/player-info") {
      if (!isLoopbackHost(req.headers.host)) {
        res.writeHead(403);
        res.end("Local access only");
        return;
      }
      const roomId = url.searchParams.get("room") || "";
      if (!roomId) {
        res.writeHead(400);
        res.end();
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          roomId,
          urls: playerUrls(roomId, Number(process.env.PORT || 5173)),
        }),
      );
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
const io = new Server(server, {
  cors: { origin: true },
  allowRequest: allowSocketRequest,
});
io.on("connection", (socket) => {
  socket.on("join encounter", (roomId) => {
    if (!roomId || typeof roomId !== "string") return;
    socket.data.roomId = roomId;
    socket.join(roomId);
    const snapshot = rooms.get(roomId);
    if (snapshot) socket.emit("encounter updated", snapshot);
  });
  socket.on("request encounter", (roomId) => {
    const id =
      typeof roomId === "string" && roomId ? roomId : socket.data.roomId;
    const snapshot = rooms.get(id);
    if (snapshot) socket.emit("encounter updated", snapshot);
  });
  socket.on("update encounter", (roomId, projection) => {
    if (!roomId || typeof roomId !== "string") return;
    rooms.update(roomId, projection);
    io.to(roomId).emit("encounter updated", projection);
  });
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const remaining = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    if (remaining === 0) rooms.drop(roomId);
  });
});
const port = Number(process.env.PORT || 5173);
server.listen(port, "0.0.0.0", () =>
  console.log("RoundKeep → http://localhost:" + port),
);
