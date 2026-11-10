import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore("lessons");
  const key = url.searchParams.get("key") || "";
  const isAdmin = () => {
    const code = process.env.ADMIN_CODE;
    return !!code && req.headers.get("x-admin-code") === code;
  };

  if (url.pathname === "/api/lessons") {
    if (req.method === "POST") {
      return isAdmin() ? Response.json({ ok: true }) : new Response("no", { status: 401 });
    }
    const { blobs } = await store.list();
    return Response.json(blobs.map((b) => b.key), { headers: { "cache-control": "no-store" } });
  }

  if (!/^\d+-\d+$/.test(key)) return new Response("bad key", { status: 400 });

  if (req.method === "GET") {
    const data = await store.get(key, { type: "arrayBuffer" });
    if (!data) return new Response("not found", { status: 404 });
    return new Response(data, {
      headers: { "content-type": "application/pdf", "cache-control": "no-cache" },
    });
  }

  if (!isAdmin()) return new Response("unauthorized", { status: 401 });

  if (req.method === "POST") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 5500000) return new Response("too large", { status: 413 });
    if (new TextDecoder().decode(buf.slice(0, 4)) !== "%PDF") return new Response("not pdf", { status: 400 });
    await store.set(key, buf);
    return Response.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await store.delete(key);
    return Response.json({ ok: true });
  }
  return new Response("method", { status: 405 });
};

export const config = { path: ["/api/lessons", "/api/file"] };
