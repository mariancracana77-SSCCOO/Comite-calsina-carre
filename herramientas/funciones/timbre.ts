// Copia de la edge function «timbre» del COMITÉ (v2). Igual que la de CCOO, pero los comentarios empiezan por «Comité:».
// v2 (lo pidió Lorena, 5/11/2026): comenta en la PR buzón n.º 13 del repo Comite-calsina-carre (despierta a «Timbres Comité»).
// Solo avisa ahí: el token GITHUB_TOKEN tiene que tener permiso en este repo (Issues y Pull requests). Si no, devuelve el error y queda la revisión de cada hora.
// La llave va en el secreto GITHUB_TOKEN (la pone Lorena en Supabase > Edge Functions > Secrets, nunca en el chat). Sin ella no hace nada.
// { id, pasar: true }: el padre pulsa «Que lo siga Lorena» (RPC pasar_a_lorena, columna pasada_lorena).
// verify_jwt desactivado: la función comprueba ella misma is_admin() con la sesión del panel o el secreto interno x-cron-secret (prueba desde SQL).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const REPO = Deno.env.get("GITHUB_REPO") || "mariancracana77-SSCCOO/Comite-calsina-carre";
const PR = Deno.env.get("GITHUB_PR") || "13";
const URL_SB = Deno.env.get("SUPABASE_URL")!, SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function comenta(texto: string) {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) return json({ ok: false, motivo: "sin_configurar" });
  const r = await fetch(`https://api.github.com/repos/${REPO}/issues/${encodeURIComponent(PR)}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "comite-calsina-panel", "Content-Type": "application/json" },
    body: JSON.stringify({ body: "Comité: " + texto }),
  });
  if (!r.ok) { const t = (await r.text()).slice(0, 300); console.error("GitHub", r.status, t); return json({ ok: false, motivo: "github_" + r.status, detalle: t }); }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const cron = req.headers.get("x-cron-secret");
  if (cron) {
    const cfg = await fetch(`${URL_SB}/rest/v1/config_privada?select=valor&clave=eq.cron_secreto`, { headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` } }).then(r => r.json()).catch(() => []);
    if (!cfg?.[0]?.valor || cron !== cfg[0].valor) return json({ error: "No autorizado" }, 401);
    return comenta("Prueba del timbre (no hay ninguna petición nueva).");
  }
  const sb = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: esAdmin } = await sb.rpc("is_admin");
  if (!esAdmin) return json({ error: "Solo las cuentas del panel" }, 403);
  let id = 0, actualizada = false, anadido = false, avisar = false, deshacer = false, decision = false, pasar = false;
  try { const b = await req.json(); id = Number(b.id) || 0; actualizada = !!b.actualizada; anadido = !!b.anadido; avisar = !!b.avisar; deshacer = !!b.deshacer; decision = !!b.decision; pasar = !!b.pasar; } catch { /* sin cuerpo */ }
  const { data: p } = await sb.from("peticiones_claude").select("id,estado,creado,actualizado,espera,mensajes,avisar_lorena,deshacer,decision,decision_el,pasada_lorena").eq("id", id).maybeSingle();
  const cuando = p ? new Date(p.actualizado || p.creado).getTime() : 0;
  const reciente = Date.now() - cuando <= 10 * 60 * 1000;
  if (pasar) {
    if (!p || !p.pasada_lorena || Date.now() - new Date(p.pasada_lorena).getTime() > 10 * 60 * 1000) return json({ ok: false, motivo: "no_pasar" });
    return comenta(`Petición n.º ${p.id}: el padre se la pasa a Lorena («Que lo siga Lorena»). Avísala al móvil; la sigue ella.`);
  }
  if (decision) {
    if (!p || !p.decision || !p.decision_el || Date.now() - new Date(p.decision_el).getTime() > 10 * 60 * 1000) return json({ ok: false, motivo: "no_decision" });
    return comenta(p.decision === "publicar" ? `Petición n.º ${p.id}: el padre ha visto las capturas y dice PUBLICAR.` : `Petición n.º ${p.id}: el padre ha visto las capturas y dice DESCARTAR.`);
  }
  if (deshacer) {
    if (!p || !p.deshacer || Date.now() - new Date(p.deshacer).getTime() > 10 * 60 * 1000) return json({ ok: false, motivo: "no_deshacer" });
    return comenta(`Petición n.º ${p.id}: el panel pide volver a como estaba antes (deshacer lo publicado).`);
  }
  if (avisar) {
    if (!p || !p.avisar_lorena || Date.now() - new Date(p.avisar_lorena).getTime() > 10 * 60 * 1000) return json({ ok: false, motivo: "no_avisar" });
    return comenta(`Petición n.º ${p.id}: el panel pide que lo mire Lorena (avísala al móvil).`);
  }
  if (anadido) {
    const ult = Array.isArray(p?.mensajes) ? p.mensajes[p.mensajes.length - 1] : null;
    const ultReciente = ult && ult.quien === "padre" && Date.now() - new Date(ult.cuando).getTime() <= 10 * 60 * 1000;
    if (!p || !ultReciente || !(p.estado === "nueva" || p.estado === "en_curso")) return json({ ok: false, motivo: "no_anadido" });
    if (p.espera) return comenta(`Petición n.º ${p.id}: se ha añadido algo, en espera para que la revise Lorena.`);
    return comenta(`Petición n.º ${p.id}: se ha añadido algo en el panel.`);
  }
  if (!p || p.estado !== "nueva" || !reciente) return json({ ok: false, motivo: "no_nueva" });
  if (p.espera) return comenta(`Petición n.º ${p.id}: en espera, para que la revise Lorena.`);
  return comenta(actualizada ? `Petición n.º ${p.id} revisada por Lorena: lista para hacer.` : `Nueva petición en el panel (n.º ${p.id}).`);
});
