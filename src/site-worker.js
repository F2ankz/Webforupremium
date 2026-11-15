const DEFAULT_LINE_URL = "https://line.me/R/ti/p/%40437hyoco";

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
      const destination = validLineUrl(env.LINE_ADD_URL) || new URL(DEFAULT_LINE_URL);
      return Response.redirect(destination.toString(), 302);
    }

    return env.ASSETS.fetch(request);
  }
};
