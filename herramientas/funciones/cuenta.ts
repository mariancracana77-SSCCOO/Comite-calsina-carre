// Función de Supabase «cuenta» (copia del código subido; si se cambia, volver a subirla). Igual que en la web de CCOO.
// Contraseñas del panel sin depender del email (el email gratuito de Supabase solo deja unos pocos por hora).
// - poner_clave: un administrador con sesión pone la contraseña a una cuenta de la lista de administradores.
//   Si esa cuenta todavía no existe, la crea ya confirmada (así no hace falta ningún email).
// - codigos: un administrador genera 8 códigos de rescate de un solo uso para su cuenta (se guardan solo resumidos).
// - estado: cuántos códigos le quedan.
// - usar_codigo: sin sesión, con su email + un código válido pone una contraseña nueva.
// verify_jwt está desactivado porque «usar_codigo» se usa sin sesión: el resto comprueba la sesión aquí dentro.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const URL_SB = Deno.env.get("SUPABASE_URL")!;
const srv = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I, que se confunden
const limpiaCodigo = (c: string) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
async function resumen(email: string, codigo: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase() + ":" + limpiaCodigo(codigo)));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const fallaClave = (p: string) => typeof p !== "string" || p.length < 10 ? "La contraseña debe tener al menos 10 caracteres."
  : p.length > 72 ? "La contraseña es demasiado larga."
  : !/[a-zA-ZñÑ]/.test(p) || !/\d/.test(p) ? "La contraseña debe mezclar letras y números." : "";
async function usuarioPorEmail(email: string) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await srv.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (u || data.users.length < 200) return u || null;
  }
  return null;
}
async function esAdminEmail(email: string) {
  const { data } = await srv.from("admins").select("email").ilike("email", email).maybeSingle();
  return !!data;
}
// Devuelve "" si va bien; si no, el motivo. «creada» indica si la cuenta se ha creado ahora.
async function ponerClave(email: string, clave: string, crearSiFalta = false): Promise<{ error: string; creada?: boolean }> {
  const u = await usuarioPorEmail(email);
  if (!u) {
    if (!crearSiFalta) return { error: "Esa cuenta todavía no está creada. Pide a otro administrador que te ponga la contraseña desde Ajustes." };
    const { error } = await srv.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (error) return { error: /weak|pwned|leaked/i.test(error.message) ? "Esa contraseña aparece en filtraciones de internet. Elige otra." : "No se ha podido crear la cuenta: " + error.message };
    return { error: "", creada: true };
  }
  const { error } = await srv.auth.admin.updateUserById(u.id, { password: clave, email_confirm: true });
  if (error) return { error: /weak|pwned|leaked/i.test(error.message) ? "Esa contraseña aparece en filtraciones de internet. Elige otra." : "No se ha podido guardar: " + error.message };
  return { error: "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let b: Record<string, string>;
  try { b = await req.json(); } catch { return json({ error: "Petición no válida." }, 400); }

  try {
    if (b.accion === "usar_codigo") {
      const email = String(b.email || "").trim().toLowerCase(), f = fallaClave(b.clave);
      if (!email || limpiaCodigo(b.codigo).length < 8) return json({ error: "Escribe tu email y el código de rescate." }, 400);
      if (f) return json({ error: f }, 400);
      await new Promise((r) => setTimeout(r, 400)); // frena a quien pruebe códigos a ciegas
      const h = await resumen(email, b.codigo);
      const { data: c } = await srv.from("codigos_rescate").select("id").eq("hash", h).is("usado", null).maybeSingle();
      if (!c || !(await esAdminEmail(email))) return json({ error: "Ese código no vale: está mal escrito o ya se usó. Prueba con otro de tu lista." }, 400);
      const r = await ponerClave(email, b.clave);
      if (r.error) return json({ error: r.error }, 400);
      await srv.from("codigos_rescate").update({ usado: new Date().toISOString() }).eq("id", c.id);
      const { count } = await srv.from("codigos_rescate").select("id", { count: "exact", head: true }).ilike("email", email).is("usado", null);
      return json({ ok: true, quedan: count ?? 0 });
    }

    // El resto, solo administradores con sesión
    const user = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const [{ data: esAdmin }, { data: yo }] = await Promise.all([user.rpc("is_admin"), user.auth.getUser()]);
    const miEmail = (yo?.user?.email || "").toLowerCase();
    if (!esAdmin || !miEmail) return json({ error: "Solo las cuentas con permiso para publicar." }, 403);

    if (b.accion === "estado") {
      const { count } = await srv.from("codigos_rescate").select("id", { count: "exact", head: true }).ilike("email", miEmail).is("usado", null);
      const { data: lista } = await srv.from("admins").select("email");
      const cuentas: Record<string, boolean> = {};
      for (const a of lista ?? []) cuentas[a.email.toLowerCase()] = !!(await usuarioPorEmail(a.email));
      return json({ quedan: count ?? 0, cuentas });
    }
    if (b.accion === "codigos") {
      await srv.from("codigos_rescate").update({ usado: new Date().toISOString() }).ilike("email", miEmail).is("usado", null); // los anteriores dejan de valer
      const codigos: string[] = [];
      for (let i = 0; i < 8; i++) {
        const r = crypto.getRandomValues(new Uint8Array(10));
        const c = [...r].map((x) => ALFABETO[x % 32]).join("");
        codigos.push(c.slice(0, 5) + "-" + c.slice(5));
      }
      const filas = await Promise.all(codigos.map(async (c) => ({ email: miEmail, hash: await resumen(miEmail, c) })));
      const { error } = await srv.from("codigos_rescate").insert(filas);
      if (error) throw error;
      return json({ codigos });
    }
    if (b.accion === "poner_clave") {
      const email = String(b.email || "").trim().toLowerCase(), f = fallaClave(b.clave);
      if (f) return json({ error: f }, 400);
      if (!(await esAdminEmail(email))) return json({ error: "Esa cuenta no está en la lista de quién puede publicar." }, 400);
      const r = await ponerClave(email, b.clave, true);
      return r.error ? json({ error: r.error }, 400) : json({ ok: true, creada: !!r.creada });
    }
    return json({ error: "Acción no válida." }, 400);
  } catch (e) {
    console.error("cuenta", String(e).slice(0, 300));
    return json({ error: "No se ha podido hacer ahora. Prueba otra vez en un momento." }, 500);
  }
});
