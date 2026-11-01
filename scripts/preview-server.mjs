import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
export async function preview() {
  const root = resolve("dist");
  const server = createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (!raw.startsWith("/preview/")) {
        res.writeHead(404);
        return res.end("Use /preview/");
      }
      const path = resolve(root, raw.slice("/preview/".length) || "index.html");
      if (!path.startsWith(root + "/")) {
        res.writeHead(403);
        return res.end();
      }
      const data = await readFile(path);
      res.writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}/preview/`,
    close: () => new Promise((r) => server.close(r)),
  };
}
