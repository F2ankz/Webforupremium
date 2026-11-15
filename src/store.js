import fs from "node:fs";
import path from "node:path";

const runtimeDir = path.resolve(process.env.DATA_DIR || ".data");
const files = {
  conversations: path.join(runtimeDir, "conversations.json"),
  processed: path.join(runtimeDir, "processed-message-ids.json"),
  orders: path.join(runtimeDir, "orders.json"),
  handoffs: path.join(runtimeDir, "handoffs.json")
};

function ensureDataDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
}

function readJson(file, fallback) {
  ensureDataDir();
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDataDir();
  const temporaryFile = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporaryFile, file);
}

export function getConversation(customerId) {
  const conversations = readJson(files.conversations, {});
  return conversations[customerId] || {
    stage: "browsing",
    cart: [],
    customer: { name: "", phone: "", address: "" },
    history: [],
    handoff: false
  };
}

export function saveConversation(customerId, conversation) {
  const conversations = readJson(files.conversations, {});
  conversations[customerId] = { ...conversation, updatedAt: new Date().toISOString() };
  writeJson(files.conversations, conversations);
}

export function hasProcessed(messageId) {
  if (!messageId) return false;
  return readJson(files.processed, []).includes(messageId);
}

export function markProcessed(messageId) {
  if (!messageId) return;
  const ids = readJson(files.processed, []);
  if (!ids.includes(messageId)) ids.push(messageId);
  writeJson(files.processed, ids.slice(-2000));
}

export function createOrder(order) {
  const orders = readJson(files.orders, []);
  orders.unshift(order);
  writeJson(files.orders, orders);
  return order;
}

export function createHandoff(handoff) {
  const handoffs = readJson(files.handoffs, []);
  handoffs.unshift(handoff);
  writeJson(files.handoffs, handoffs);
  return handoff;
}

export function listOrders() {
  return readJson(files.orders, []);
}

export function listHandoffs() {
  return readJson(files.handoffs, []);
}
