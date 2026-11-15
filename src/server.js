import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { handleCustomerMessage } from "./bot.js";
import { hasProcessed, listHandoffs, listOrders, markProcessed } from "./store.js";

const port = Number(process.env.PORT || 3000);
const publicDir = path.resolve("public");

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(body);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyMetaSignature(rawBody, signature) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function sendMessengerText(recipientId, text) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!accessToken) throw new Error("META_PAGE_ACCESS_TOKEN is not configured");
  const version = process.env.META_GRAPH_VERSION || "v24.0";
  const response = await fetch(`https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text }
    })
  });
  if (!response.ok) throw new Error(`Meta Send API ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

async function processWebhook(payload) {
  if (payload.object !== "page") return;
  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      const messageId = event.message?.mid;
      const text = event.message?.text?.trim();
      const customerId = event.sender?.id;
      if (!customerId || !text || event.message?.is_echo || hasProcessed(messageId)) continue;
      markProcessed(messageId);
      try {
        const reply = await handleCustomerMessage(customerId, text);
        await sendMessengerText(customerId, reply);
      } catch (error) {
        console.error("Webhook event failed:", error.message);
      }
    }
  }
}

function authorized(req) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return false;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const suppliedUser = decoded.slice(0, separator);
  const suppliedPassword = decoded.slice(separator + 1);
  const safeEqual = (left, right) => crypto.timingSafeEqual(
    crypto.createHash("sha256").update(left).digest(),
    crypto.createHash("sha256").update(right).digest()
  );
  const userMatch = safeEqual(suppliedUser, username);
  const passwordMatch = safeEqual(suppliedPassword, password);
  return userMatch && passwordMatch;
}

function requireAdmin(req, res) {
  if (authorized(req)) return true;
  res.writeHead(401, { "WWW-Authenticate": "Basic realm=UPremium Admin", "Content-Type": "text/plain; charset=utf-8" });
  res.end("กรุณาเข้าสู่ระบบ");
  return false;
}

function servePublic(res, filename, type) {
  const fullPath = path.join(publicDir, filename);
  if (!fs.existsSync(fullPath)) return send(res, 404, "Not found");
  send(res, 200, fs.readFileSync(fullPath), type);
}

const DEFAULT_LINE_URL = "https://line.me/R/ti/p/%40437hyoco";

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4"
};

function serveSafeSubdir(res, urlPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPathname);
  } catch {
    return send(res, 400, "Bad request");
  }
  const fullPath = path.resolve(publicDir, "." + decoded);
  if (!fullPath.startsWith(publicDir + path.sep) || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return send(res, 404, "Not found");
  }
  const ext = path.extname(fullPath).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) return send(res, 404, "Not found");
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=3600" });
  return res.end(fs.readFileSync(fullPath));
}

function lineAddUrl() {
  const candidate = process.env.LINE_ADD_URL;
  if (!candidate) return DEFAULT_LINE_URL;
  try {
    const url = new URL(candidate);
    if (!["line.me", "lin.ee"].includes(url.hostname)) return DEFAULT_LINE_URL;
    return url.toString();
  } catch {
    return DEFAULT_LINE_URL;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    return servePublic(res, "index.html", "text/html; charset=utf-8");
  }
  if (req.method === "GET" && url.pathname === "/home.css") return servePublic(res, "home.css", "text/css; charset=utf-8");
  if (req.method === "GET" && url.pathname === "/home.js") return servePublic(res, "home.js", "text/javascript; charset=utf-8");
  if (req.method === "GET" && url.pathname === "/favicon.svg") return servePublic(res, "favicon.svg", "image/svg+xml");
  if (req.method === "GET" && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/catalogs/"))) {
    return serveSafeSubdir(res, url.pathname);
  }
  if (req.method === "GET" && url.pathname === "/line") {
    const destination = lineAddUrl();
    res.writeHead(302, { Location: destination, "Cache-Control": "no-store" });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/webhook") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) return send(res, 200, challenge || "");
    return send(res, 403, "Verification failed");
  }

  if (req.method === "POST" && url.pathname === "/webhook") {
    try {
      const rawBody = await collectBody(req);
      if (!verifyMetaSignature(rawBody, req.headers["x-hub-signature-256"])) return send(res, 401, "Invalid signature");
      const payload = JSON.parse(rawBody.toString("utf8"));
      send(res, 200, "EVENT_RECEIVED");
      setImmediate(() => processWebhook(payload));
    } catch (error) {
      console.error("Webhook request failed:", error.message);
      if (!res.headersSent) send(res, 400, "Bad request");
    }
    return;
  }

  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/")) {
    if (!requireAdmin(req, res)) return;
  }

  if (req.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) {
    return servePublic(res, "admin.html", "text/html; charset=utf-8");
  }
  if (req.method === "GET" && url.pathname === "/admin/app.js") return servePublic(res, "app.js", "text/javascript; charset=utf-8");
  if (req.method === "GET" && url.pathname === "/admin/styles.css") return servePublic(res, "styles.css", "text/css; charset=utf-8");
  if (req.method === "GET" && url.pathname === "/api/orders") return send(res, 200, JSON.stringify(listOrders()), "application/json; charset=utf-8");
  if (req.method === "GET" && url.pathname === "/api/handoffs") return send(res, 200, JSON.stringify(listHandoffs()), "application/json; charset=utf-8");

  return send(res, 404, "Not found");
});

server.listen(port, () => {
  console.log(`Facebook AI Sales Assistant listening on http://localhost:${port}`);
});
