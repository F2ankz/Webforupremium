import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  createHandoff,
  createOrder,
  getConversation,
  saveConversation
} from "./store.js";

const productFile = path.resolve(process.env.PRODUCT_FILE || "data/products.json");

export function loadProducts() {
  return JSON.parse(fs.readFileSync(productFile, "utf8")).filter((product) => product.active !== false);
}

export function cartSummary(cart, products) {
  const lines = [];
  let total = 0;
  for (const item of cart) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) continue;
    const subtotal = product.price * item.quantity;
    total += subtotal;
    lines.push(`${product.name} x ${item.quantity} = ${subtotal.toLocaleString("th-TH")} บาท`);
  }
  return { lines, total };
}

export function orderIsReady(conversation) {
  return conversation.cart.length > 0 && Boolean(
    conversation.customer.name &&
    conversation.customer.phone &&
    conversation.customer.address
  );
}

function responseText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI response did not contain output text");
}

const decisionSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["answer", "add_to_cart", "start_checkout", "provide_customer_info", "confirm_order", "handoff"]
    },
    productId: { type: ["string", "null"] },
    quantity: { type: ["integer", "null"], minimum: 1, maximum: 99 },
    customer: {
      type: "object",
      properties: {
        name: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        address: { type: ["string", "null"] }
      },
      required: ["name", "phone", "address"],
      additionalProperties: false
    },
    reply: { type: "string" }
  },
  required: ["action", "productId", "quantity", "customer", "reply"],
  additionalProperties: false
};

async function inferDecision(message, conversation, products) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      action: "handoff",
      productId: null,
      quantity: null,
      customer: { name: null, phone: null, address: null },
      reply: "ขณะนี้ระบบ AI ยังไม่ได้เชื่อมต่อ กำลังส่งเรื่องให้แอดมินดูแลค่ะ"
    };
  }

  const catalog = products.map(({ id, name, description, price, stock, aliases }) => ({
    id, name, description, price, stock, aliases
  }));

  const instructions = `คุณคือแอดมินฝ่ายขายของ ${process.env.BUSINESS_NAME || "ร้านค้า"} ตอบภาษาไทยสุภาพ กระชับ และเป็นธรรมชาติ
ใช้ข้อมูลในแคตตาล็อกเท่านั้น ห้ามแต่งราคา สต็อก สรรพคุณ โปรโมชั่น หรือเงื่อนไข
ถ้าลูกค้าต้องการซื้อ ให้ช่วยระบุสินค้าและจำนวน จากนั้นเก็บชื่อ เบอร์โทร และที่อยู่
สร้างคำสั่งซื้อได้ต่อเมื่อลูกค้ายืนยันอย่างชัดเจนเท่านั้น
ถ้าคำถามไม่มีข้อมูลรองรับ ลูกค้าโกรธ ขอคน หรือเป็นเรื่องชำระเงิน/ร้องเรียน ให้ handoff
อย่าขอข้อมูลบัตร เลขบัญชี รหัสผ่าน หรือ OTP
แคตตาล็อก: ${JSON.stringify(catalog)}
สถานะปัจจุบัน: ${JSON.stringify({ stage: conversation.stage, cart: conversation.cart, customer: conversation.customer })}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        instructions,
        input: message,
        text: {
          format: {
            type: "json_schema",
            name: "facebook_sales_action",
            strict: true,
            schema: decisionSchema
          }
        }
      }),
      signal: controller.signal
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      throw new Error(`OpenAI API ${apiResponse.status}: ${errorBody.slice(0, 300)}`);
    }
    return JSON.parse(responseText(await apiResponse.json()));
  } finally {
    clearTimeout(timeout);
  }
}

function mergeCustomer(current, incoming) {
  const next = { ...current };
  for (const field of ["name", "phone", "address"]) {
    if (typeof incoming?.[field] === "string" && incoming[field].trim()) {
      next[field] = incoming[field].trim().slice(0, field === "address" ? 500 : 100);
    }
  }
  return next;
}

function addToCart(cart, productId, quantity) {
  const next = cart.map((item) => ({ ...item }));
  const existing = next.find((item) => item.productId === productId);
  if (existing) existing.quantity += quantity;
  else next.push({ productId, quantity });
  return next;
}

function newId(prefix) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function handleCustomerMessage(customerId, message) {
  const products = loadProducts();
  const conversation = getConversation(customerId);
  conversation.history = [...(conversation.history || []), { role: "user", text: message, at: new Date().toISOString() }].slice(-12);

  if (conversation.handoff) {
    saveConversation(customerId, conversation);
    return "แอดมินได้รับเรื่องแล้วค่ะ กรุณารอสักครู่ แอดมินจะเข้ามาดูแลต่อในแชตนี้";
  }

  let decision;
  try {
    decision = await inferDecision(message, conversation, products);
  } catch (error) {
    console.error("AI decision failed:", error.message);
    decision = {
      action: "handoff",
      productId: null,
      quantity: null,
      customer: { name: null, phone: null, address: null },
      reply: "ขออภัยค่ะ ระบบตอบกลับติดขัดชั่วคราว กำลังส่งต่อให้แอดมินดูแลค่ะ"
    };
  }

  conversation.customer = mergeCustomer(conversation.customer, decision.customer);
  let reply = decision.reply;

  if (decision.action === "add_to_cart") {
    const product = products.find((item) => item.id === decision.productId);
    const quantity = Number.isInteger(decision.quantity) ? decision.quantity : 1;
    if (!product) {
      reply = "ยังไม่พบสินค้านี้ในระบบค่ะ ขอชื่อสินค้าหรือรูปสินค้าอีกครั้งได้ไหมคะ";
    } else if (quantity > product.stock) {
      reply = `${product.name} มีสินค้าในระบบ ${product.stock} ชิ้นค่ะ ต้องการปรับจำนวนไหมคะ`;
    } else {
      conversation.cart = addToCart(conversation.cart, product.id, quantity);
      const summary = cartSummary(conversation.cart, products);
      reply = `${reply}\n\nตะกร้าปัจจุบัน:\n${summary.lines.join("\n")}\nรวม ${summary.total.toLocaleString("th-TH")} บาท`;
    }
  }

  if (["start_checkout", "provide_customer_info"].includes(decision.action)) {
    conversation.stage = "collecting_customer";
    const missing = [
      !conversation.customer.name && "ชื่อผู้รับ",
      !conversation.customer.phone && "เบอร์โทร",
      !conversation.customer.address && "ที่อยู่จัดส่ง"
    ].filter(Boolean);
    if (missing.length) reply = `${reply}\n\nขอข้อมูลเพิ่มเติม: ${missing.join(", ")}`;
    else reply = `${reply}\n\nข้อมูลครบแล้วค่ะ หากถูกต้อง กรุณาพิมพ์ “ยืนยันออเดอร์”`;
  }

  if (decision.action === "confirm_order") {
    if (!orderIsReady(conversation)) {
      const missing = [
        conversation.cart.length === 0 && "สินค้า",
        !conversation.customer.name && "ชื่อผู้รับ",
        !conversation.customer.phone && "เบอร์โทร",
        !conversation.customer.address && "ที่อยู่จัดส่ง"
      ].filter(Boolean);
      reply = `ยังยืนยันออเดอร์ไม่ได้ค่ะ ขาดข้อมูล: ${missing.join(", ")}`;
    } else {
      const summary = cartSummary(conversation.cart, products);
      const order = createOrder({
        id: newId("ORD"),
        facebookCustomerId: customerId,
        customer: conversation.customer,
        items: conversation.cart,
        total: summary.total,
        status: "new",
        createdAt: new Date().toISOString()
      });
      reply = `รับออเดอร์เรียบร้อยค่ะ เลขที่ ${order.id}\n${summary.lines.join("\n")}\nรวม ${summary.total.toLocaleString("th-TH")} บาท\nแอดมินจะตรวจสอบและยืนยันการจัดส่งอีกครั้งค่ะ`;
      conversation.stage = "browsing";
      conversation.cart = [];
      conversation.customer = { name: "", phone: "", address: "" };
    }
  }

  if (decision.action === "handoff") {
    conversation.handoff = true;
    createHandoff({
      id: newId("HELP"),
      facebookCustomerId: customerId,
      lastMessage: message.slice(0, 1000),
      status: "waiting",
      createdAt: new Date().toISOString()
    });
  }

  conversation.history.push({ role: "assistant", text: reply, at: new Date().toISOString() });
  conversation.history = conversation.history.slice(-12);
  saveConversation(customerId, conversation);
  return reply.slice(0, 1900);
}
