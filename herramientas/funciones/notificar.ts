// Función de Supabase «notificar» (copia del código que está subido; si se cambia, volver a subirla).
// Manda avisos al móvil (notificaciones push) cuando el comité publica algo.
// - Desde el panel: un admin con su sesión ({modo: "publicado", tabla, id, cambio?}, {modo: "estado"}, {modo: "prueba"}).
// - Tarea programada cada 10 min (pg_cron, cabecera x-cron-secret): avisos programados que ya tocan y pendientes.
//   v10: el día en que un aviso sale destacado en la portada («Destacar en la portada el día»), manda «DESTACADO HOY: …»
//   una sola vez, a partir de las 8:00 de Madrid (para no despertar a nadie). Se marca antes de enviar.
// v11: también avisa de lo publicado en las secciones propias (tabla publicaciones).
// Las claves VAPID se crean aquí la primera vez y se guardan en config_privada: la privada nunca sale del servidor.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const admin = createClient(URL_SB, SERVICIO, { auth: { persistSession: false } });

async function config(): Promise<Record<string, string>> {
  const { data } = await admin.from("config_privada").select("clave, valor");
  const cfg: Record<string, string> = Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor]));
  if (!cfg.vapid_publica || !cfg.vapid_privada) {
    const k = webpush.generateVAPIDKeys();
    // Si otra llamada las creó a la vez, se queda con las que ya estén guardadas
    await admin.from("config_privada").upsert([{ clave: "vapid_publica", valor: k.publicKey }, { clave: "vapid_privada", valor: k.privateKey }], { onConflict: "clave", ignoreDuplicates: true });
    return config();
  }
  return cfg;
}
const recorta = (t: string, n: number) => { t = (t || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const fechaCorta = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

type Msg = { titulo: string; cuerpo: string; url: string };
const TABLAS: Record<string, (x: any, web: string) => Msg> = {
  avisos: (x, web) => ({ titulo: (x.urgente ? "URGENTE: " : "Aviso: ") + x.titulo, cuerpo: recorta(x.contenido, 140) || "Ya está en la web del comité.", url: web + "#aviso-" + x.id }),
  actualidad: (x, web) => ({ titulo: "Info general: " + x.titulo, cuerpo: recorta(x.contenido, 140) || "Ya está en la web del comité.", url: web + "#noticia-" + x.id }),
  reuniones: (x, web) => ({ titulo: "Reunión: " + x.titulo, cuerpo: fechaCorta(x.fecha) + (x.hora ? ", " + x.hora : "") + (x.lugar ? " · " + x.lugar : ""), url: web + "#reunion-" + x.id }),
  actas: (x, web) => ({ titulo: "Nueva acta: " + x.titulo, cuerpo: recorta(x.acuerdos || x.resumen || "Ya está en la web del comité.", 140), url: web + "#acta-" + x.id }),
  encuestas: (x, web) => ({ titulo: "Consulta: " + x.pregunta, cuerpo: "Vota de forma anónima en la web del comité." + (x.cierra ? " Hasta el " + fechaCorta(x.cierra) + "." : ""), url: web + "#consulta-" + x.id }),
  documentos: (x, web) => ({ titulo: "Nuevo documento: " + x.titulo, cuerpo: recorta(x.descripcion, 140) || "Ya está en la web del comité.", url: web + "#documento-" + x.id }),
  // v11: lo que el padre publica en sus propias secciones (x._seccion lo pone avisarDe)
  publicaciones: (x, web) => ({ titulo: (x._seccion ? x._seccion + ": " : "") + x.titulo, cuerpo: recorta(x.contenido, 140) || "Ya está en la web del comité.", url: web + "#publicacion-" + x.id }),
};

async function enviarPush(cfg: Record<string, string>, m: Msg, etiqueta: string) {
  webpush.setVapidDetails(cfg.vapid_contacto, cfg.vapid_publica, cfg.vapid_privada);
  const { data: subs } = await admin.from("push_subs").select("*");
  const carga = JSON.stringify({ titulo: recorta(m.titulo, 120), cuerpo: m.cuerpo, url: m.url, etiqueta });
  let ok = 0, fallos = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: "high" });
      ok++;
      await admin.from("push_subs").update({ ultimo_ok: new Date().toISOString() }).eq("endpoint", s.endpoint);
    } catch (e) {
      fallos++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subs").delete().eq("endpoint", s.endpoint); // móvil que desactivó los avisos
      else console.error("push", code, String(e).slice(0, 200));
    }
  }
  return { ok, fallos, total: (subs ?? []).length };
}

// Avisa de algo una sola vez (se marca antes de enviar)
async function avisarDe(tabla: string, id: number, cfg: Record<string, string>, cambio = false) {
  const { data: filas } = await admin.from(tabla).update({ notificado: true }).eq("id", id).eq("notificado", false).eq("notificar", true).select("*");
  const x = filas?.[0];
  if (!x) return { enviado: false, motivo: "ya avisado o sin aviso" };
  if (tabla === "avisos" && x.publicar_en && new Date(x.publicar_en) > new Date()) {
    await admin.from(tabla).update({ notificado: false }).eq("id", id); // se avisará cuando se publique
    return { enviado: false, motivo: "programado" };
  }
  if (((tabla === "actualidad" || tabla === "publicaciones") && !x.publicado) || (tabla === "encuestas" && !x.publicada)) return { enviado: false, motivo: "oculto" };
  if (tabla === "publicaciones") {
    const { data: ap } = await admin.from("apartados").select("titulo, visible").eq("id", x.apartado_id).maybeSingle();
    if (!ap?.visible) return { enviado: false, motivo: "oculto" };
    x._seccion = ap.titulo;
  }
  const m = TABLAS[tabla](x, cfg.web_url);
  if (cambio) m.titulo = "Cambio: " + (x.titulo || x.pregunta);
  return { enviado: true, push: await enviarPush(cfg, m, tabla + "-" + id) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { /* vacío */ }
  const cfg = await config();

  if (body.modo === "cron") {
    if (!cfg.cron_secreto || req.headers.get("x-cron-secret") !== cfg.cron_secreto) return json({ error: "No autorizado" }, 401);
    const ahora = new Date().toISOString(), desde = new Date(Date.now() - 2 * 86400000).toISOString();
    const res: unknown[] = [];
    for (const t of Object.keys(TABLAS)) {
      let q = admin.from(t).select("id").eq("notificar", true).eq("notificado", false);
      if (t === "avisos") q = q.or(`publicar_en.lte.${ahora},and(publicar_en.is.null,fecha.gte.${desde})`);
      else q = q.gte("creado", desde);
      const { data } = await q.limit(10);
      for (const r of data ?? []) res.push({ t, id: r.id, ...(await avisarDe(t, r.id, cfg)) });
    }
    // Avisos destacados hoy en la portada (como en CCOO): una notificación ese día, aunque el aviso sea antiguo
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    if (Number(p.hour) >= 8) {
      const hoy = `${p.year}-${p.month}-${p.day}`;
      const { data: dest, error: errDest } = await admin.from("avisos").update({ destacado_avisado: true }).eq("destacado_avisado", false).eq("destacar_dia", hoy)
        .or(`publicar_en.is.null,publicar_en.lte.${ahora}`).select("*");
      if (errDest) console.error("destacados", errDest.message);
      for (const x of dest ?? []) {
        const m = TABLAS.avisos(x, cfg.web_url);
        m.titulo = "DESTACADO HOY: " + x.titulo;
        res.push({ t: "destacado", id: x.id, push: await enviarPush(cfg, m, "avisos-" + x.id + "-destacado") });
      }
    }
    return json({ ok: true, procesados: res });
  }

  // Lo demás, solo administradores del comité
  const usuario = createClient(URL_SB, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: esAdmin } = await usuario.rpc("is_admin");
  if (!esAdmin) return json({ error: "Solo las cuentas con permiso para publicar." }, 403);

  if (body.modo === "publicado") {
    if (!TABLAS[body.tabla] || !Number.isInteger(body.id)) return json({ error: "Datos no válidos" }, 400);
    if (body.cambio === true) await admin.from(body.tabla).update({ notificado: false, notificar: true }).eq("id", body.id);
    return json(await avisarDe(body.tabla, body.id, cfg, body.cambio === true));
  }
  if (body.modo === "estado") {
    const { count } = await admin.from("push_subs").select("*", { count: "exact", head: true });
    return json({ suscritos: count ?? 0 });
  }
  if (body.modo === "prueba") {
    return json({ push: await enviarPush(cfg, { titulo: "Prueba de avisos", cuerpo: "Si ves esto, los avisos del comité funcionan.", url: cfg.web_url }, "prueba") });
  }
  return json({ error: "Acción desconocida" }, 400);
});
