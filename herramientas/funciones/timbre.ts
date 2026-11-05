// Copia de la edge function «timbre» del COMITÉ (v1). Igual que la de CCOO, pero los comentarios empiezan por «Comité:» y van a la misma PR buzón n.º 2 del repo SSCCOO (la sesión «Timbres» de Claude atiende las dos webs).
// Timbre de «Pedir un cambio a Claude» (v117): cuando un admin envía o actualiza una petición desde el panel, deja un comentario corto
// en la pull request «buzón» n.º 2 de GitHub (rama buzon-peticiones, nunca se fusiona). Ese comentario despierta la sesión de Claude,
// que lee la petición en Supabase. El comentario NO lleva el texto de la petición (el repositorio es público).
// Si la petición está en espera (Lorena quiere revisarla antes), el comentario lo dice y Claude solo avisa a Lorena.
// v121: { id, anadido: true } cuando el padre añade algo a una petición que ya mandó (columna mensajes, RPC anadir_a_peticion).
// v121: { id, avisar: true } cuando el padre pulsa «Avisar a Lorena» (RPC pedir_lorena, columna avisar_lorena): Claude la avisa al móvil.
// v125: { id, decision: true } cuando el padre pulsa «Publicar» o «Descartar» en lo que Claude le ha preparado (RPC decidir_peticion, columnas propuesta/decision).
// v122: { id, deshacer: true } cuando el padre pulsa «Volver a como estaba antes» (RPC deshacer_peticion, columna deshacer).
// La llave va en el secreto GITHUB_TOKEN (la pone Lorena en Supabase > Edge Functions > Secrets, nunca en el chat). Sin ella no hace nada.
// verify_jwt desactivado: la función comprueba ella misma is_admin() con la sesión del panel o el secreto interno x-cron-secret (prueba desde SQL).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const REPO = "mariancracana77-SSCCOO/SSCCOO";
const PR = Deno.env.get("GITHUB_PR") || "2";
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
  let id = 0, actualizada = false, anadido = false, avisar = false, deshacer = false, decision = false;
  try { const b = await req.json(); id = Number(b.id) || 0; actualizada = !!b.actualizada; anadido = !!b.anadido; avisar = !!b.avisar; deshacer = !!b.deshacer; decision = !!b.decision; } catch { /* sin cuerpo */ }
  // Solo para una petición nueva (o con algo añadido) enviada o tocada hace poco (no se puede usar para llenar GitHub de comentarios)
  const { data: p } = await sb.from("peticiones_claude").select("id,estado,creado,actualizado,espera,mensajes,avisar_lorena,deshacer,decision,decision_el").eq("id", id).maybeSingle();
  const cuando = p ? new Date(p.actualizado || p.creado).getTime() : 0;
  const reciente = Date.now() - cuando <= 10 * 60 * 1000;
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
