import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import type { App } from "./app.js";

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

export function createNodeListener(app: App): RequestListener {
  return (req: IncomingMessage, res: ServerResponse): void => {
    void (async () => {
      const rawBody = await readRawBody(req);
      const result = await app.dispatch({
        method: req.method ?? "GET",
        url: req.url ?? "/",
        headers: req.headers,
        rawBody,
      });
      res.writeHead(result.status, result.headers);
      res.end(result.body);
    })().catch(() => {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/problem+json; charset=utf-8" });
      }
      res.end(
        JSON.stringify({
          type: "about:blank",
          title: "Internal Server Error",
          status: 500,
        }),
      );
    });
  };
}
