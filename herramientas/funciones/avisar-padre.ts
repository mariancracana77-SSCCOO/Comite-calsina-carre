// Copia de la edge function «avisar-padre» (v2). La que manda es la de Supabase.
// Avisos al móvil SOLO para quien usa el panel (lo pidió Lorena, 5/11/2026: «que la noti le llegue solo a su dispositivo»).
// Manda a la tabla push_admin (móviles que activaron «Avisarme en este móvil» en Pedir un cambio a Claude), nunca a push_subs.
// La llaman: el disparador peticiones_avisa_padre (cuando Claude contesta en el chat de una petición) con x-cron-secret,
// o Claude por SQL con x-cron-secret para avisar de novedades del panel. También un admin con su sesión (prueba).
// v2 (5/11/2026, lo pidió Lorena): columna push_admin.para ('padre' | 'lorena'); el cuerpo lleva «para» (por defecto 'padre')
// y solo se manda a los móviles de ese destinatario. Lorena recibe los avisos de lo que hace su padre (disparador peticiones_avisa_lorena).
// verify_jwt desactivado: la función comprueba ella misma el secreto o is_admin().
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const URL_SB = Deno.env.get("SUPABASE_URL")!, SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_SB, SERVICIO, { auth: { persistSession: false } });
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
const recorta = (t: unknown, n: number) => { const s = String(t ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const { data: filas } = await admin.from("config_privada").select("clave, valor");
  const cfg: Record<string, string> = Object.fromEntries((filas ?? []).map((f: { clave: string; valor: string }) => [f.clave, f.valor]));
  const cron = req.headers.get("x-cron-secret");
  let permitido = !!cron && !!cfg.cron_secreto && cron === cfg.cron_secreto;
  if (!permitido && req.headers.get("Authorization")) {
    const u = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });
    const { data } = await u.rpc("is_admin"); permitido = !!data;
  }
  if (!permitido) return json({ error: "No autorizado" }, 401);
  if (!cfg.vapid_privada) return json({ ok: false, motivo: "sin_vapid" });
  let b: { titulo?: string; cuerpo?: string; url?: string; email?: string; para?: string } = {};
  try { b = await req.json(); } catch { /* sin cuerpo */ }
  const para = b.para === "lorena" ? "lorena" : "padre";
  const url = /^admin\.html(#[a-z0-9-]*)?$/.test(String(b.url || "")) ? String(b.url) : "admin.html#peticiones";
  const carga = JSON.stringify({ titulo: recorta(b.titulo || "Panel del comité", 80), cuerpo: recorta(b.cuerpo || "", 180), url, etiqueta: para === "lorena" ? "panel-lorena" : "panel-claude" });
  webpush.setVapidDetails(cfg.vapid_contacto, cfg.vapid_publica, cfg.vapid_privada);
  let q = admin.from("push_admin").select("*").eq("para", para);
  if (b.email) q = q.eq("email", b.email);
  const { data: subs } = await q;
  let ok = 0, fallos = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: "high" });
      ok++; await admin.from("push_admin").update({ ultimo_ok: new Date().toISOString() }).eq("endpoint", s.endpoint);
    } catch (e) {
      fallos++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_admin").delete().eq("endpoint", s.endpoint);
      else console.error("push", code, String(e).slice(0, 200));
    }
  }
  return json({ ok: true, enviados: ok, fallos });
});
