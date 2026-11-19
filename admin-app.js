const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" });

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

async function load() {
  const button = document.querySelector("#refresh");
  button.disabled = true;
  try {
    const [ordersResponse, handoffsResponse] = await Promise.all([fetch("/api/orders"), fetch("/api/handoffs")]);
    if (!ordersResponse.ok || !handoffsResponse.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const orders = await ordersResponse.json();
    const handoffs = await handoffsResponse.json();
    const newOrders = orders.filter((order) => order.status === "new");
    document.querySelector("#order-count").textContent = newOrders.length.toLocaleString("th-TH");
    document.querySelector("#sales-total").textContent = money.format(orders.reduce((sum, order) => sum + Number(order.total || 0), 0));
    document.querySelector("#handoff-count").textContent = handoffs.filter((item) => item.status === "waiting").length.toLocaleString("th-TH");
    document.querySelector("#updated-at").textContent = `อัปเดต ${date.format(new Date())}`;
    document.querySelector("#orders").innerHTML = orders.length ? orders.map((order) => `
      <tr>
        <td><strong>${escapeHtml(order.id)}</strong></td>
        <td>${escapeHtml(order.customer?.name || "–")}</td>
        <td>${escapeHtml(order.customer?.phone || "–")}</td>
        <td>${money.format(order.total || 0)}</td>
        <td><span class="badge">${escapeHtml(order.status)}</span></td>
        <td>${date.format(new Date(order.createdAt))}</td>
      </tr>`).join("") : '<tr><td colspan="6" class="empty">ยังไม่มีออเดอร์</td></tr>';
    document.querySelector("#handoffs").innerHTML = handoffs.length ? handoffs.map((item) => `
      <article class="handoff"><strong>${escapeHtml(item.id)}</strong><p>${escapeHtml(item.lastMessage)}</p></article>`).join("") : '<p class="empty">ไม่มีแชตที่รอแอดมิน</p>';
  } catch (error) {
    document.querySelector("#orders").innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;
  } finally {
    button.disabled = false;
  }
}

document.querySelector("#refresh").addEventListener("click", load);
load();
