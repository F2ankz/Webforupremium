function validLineUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ["line.me", "lin.ee"].includes(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname === "/line") {
      const destination = validLineUrl(env.LINE_ADD_URL);
      if (destination) return Response.redirect(destination.toString(), 302);

      return new Response("กรุณาตั้งค่าลิงก์ LINE Official Account", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
