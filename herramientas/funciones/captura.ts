// captura (v126: también con x-ficha, una ficha de un solo uso de public.captura_fichas que da privado.nueva_ficha_captura(); así la imagen se manda con curl y no por SQL)
// captura (v124): sube una captura de pantalla de Claude al bucket «peticiones» para enseñársela al padre en el chat de su petición.
// verify_jwt desactivado; solo con x-cron-secret (config_privada.cron_secreto). Se llama por SQL con net.http_post
// (body {nombre, tipo, base64}) y devuelve {ok, url}; luego Claude añade {quien:'claude', texto, adjuntos:[{nombre, url, tipo}]} a peticiones_claude.mensajes.
// Solo imágenes PNG/JPEG/WebP de hasta 3 MB. Copia del código desplegado en Supabase.
const URL_SB = Deno.env.get("SUPABASE_URL")!, CLAVE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
const TIPOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const cfg = await fetch(`${URL_SB}/rest/v1/config_privada?select=valor&clave=eq.cron_secreto`, { headers: H }).then(r => r.json()).catch(() => []);
  let vale = !!cfg?.[0]?.valor && req.headers.get("x-cron-secret") === cfg[0].valor;
  const ficha = req.headers.get("x-ficha") || "";
  if (!vale && /^[0-9a-f]{36}$/.test(ficha)) {
    const q = `${URL_SB}/rest/v1/captura_fichas?token=eq.${ficha}&caduca=gt.${encodeURIComponent(new Date().toISOString())}`;
    const usada = await fetch(q, { method: "DELETE", headers: { ...H, Prefer: "return=representation" } }).then(r => r.json()).catch(() => []);
    vale = Array.isArray(usada) && usada.length === 1;
  }
  if (!vale) return json({ error: "No autorizado" }, 401);
  let b: { nombre?: string; tipo?: string; base64?: string };
  try { b = await req.json(); } catch { return json({ error: "JSON" }, 400); }
  const ext = TIPOS[b.tipo || ""];
  if (!ext || !b.base64) return json({ error: "Solo imágenes PNG, JPEG o WebP" }, 400);
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(b.base64), c => c.charCodeAt(0)); } catch { return json({ error: "base64" }, 400); }
  if (bytes.length > 3 * 1048576) return json({ error: "Demasiado grande" }, 413);
  const limpio = String(b.nombre || "captura").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "captura";
  const ruta = `claude-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${limpio}.${ext}`;
  const r = await fetch(`${URL_SB}/storage/v1/object/peticiones/${ruta}`, { method: "POST", headers: { ...H, "Content-Type": b.tipo!, "cache-control": "31536000" }, body: bytes });
  if (!r.ok) return json({ error: "Subida: " + r.status + " " + (await r.text()).slice(0, 200) }, 500);
  return json({ ok: true, url: `${URL_SB}/storage/v1/object/public/peticiones/${ruta}`, tipo: b.tipo, tamano: bytes.length });
});
