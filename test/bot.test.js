import test from "node:test";
import assert from "node:assert/strict";
import { cartSummary, orderIsReady } from "../src/bot.js";

test("cartSummary calculates item totals", () => {
  const result = cartSummary(
    [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }],
    [{ id: "p1", name: "A", price: 100 }, { id: "p2", name: "B", price: 250 }]
  );
  assert.equal(result.total, 450);
  assert.deepEqual(result.lines, ["A x 2 = 200 บาท", "B x 1 = 250 บาท"]);
});

test("orderIsReady requires cart and complete delivery data", () => {
  assert.equal(orderIsReady({ cart: [{ productId: "p1", quantity: 1 }], customer: { name: "Ann", phone: "081", address: "Bangkok" } }), true);
  assert.equal(orderIsReady({ cart: [], customer: { name: "Ann", phone: "081", address: "Bangkok" } }), false);
});
