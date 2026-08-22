import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";

const root = resolve(import.meta.dirname, "../docs");
const port = Number(process.env.PORT ?? 4173);
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer((request, response) => {
  const path = request.url?.split("?")[0] ?? "/";
  const relative = path === "/" ? "index.html" : path.replace(/^\/+/, "");
  const file = resolve(root, relative);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(response);
}).listen(port, "0.0.0.0", () => console.log(`Static docs listening on ${port}`));
