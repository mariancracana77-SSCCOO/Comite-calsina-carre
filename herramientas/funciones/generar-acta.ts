// Función de Supabase «generar-acta» (copia del código subido; si se cambia, volver a subirla). Igual que en la web de CCOO.
// Redacta el borrador de un acta a partir de fotos, PDF o texto de una reunión, con la IA gratuita de Google (Gemini).
// Solo la pueden usar los administradores (se comprueba con su sesión; verify_jwt activado). Nunca guarda nada:
// devuelve el borrador y el padre lo revisa en el panel antes de publicar.
// Necesita el secreto GEMINI_API_KEY en Supabase (Edge Functions → Secrets). Lo pone Lorena; nunca por el chat.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELOS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"]; // los dos con plan gratuito
const MIME_OK = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "text/plain"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: esAdmin, error: errAdmin } = await sb.rpc("is_admin");
  if (errAdmin || !esAdmin) return json({ error: "Solo las cuentas con permiso para publicar pueden usar el asistente." }, 403);

  let body: { notas?: string; tipos?: string[]; hoy?: string; archivos?: { mime: string; data: string; nombre?: string }[] };
  try { body = await req.json(); } catch { return json({ error: "Los archivos son demasiado grandes o la petición no es válida." }, 400); }
  const notas = (body.notas ?? "").trim();
  const archivos = (body.archivos ?? []).filter((a) => a && MIME_OK.includes(a.mime) && typeof a.data === "string").slice(0, 6);
  const pesoTotal = archivos.reduce((s, a) => s + a.data.length * 0.75, 0);
  if (pesoTotal > 18 * 1024 * 1024) return json({ error: "Los archivos pesan demasiado (como mucho unos 18 MB en total). Quita alguno." }, 400);
  if (notas.length < 20 && !archivos.length) return json({ error: "Añade una foto o un archivo con las notas de la reunión." }, 400);
  if (notas.length > 60000) return json({ error: "Los documentos tienen demasiado texto. Sube solo la parte de la reunión." }, 400);
  const tipos = (body.tipos ?? []).filter((t) => typeof t === "string").slice(0, 30);
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(body.hoy ?? "") ? body.hoy! : new Date().toISOString().slice(0, 10);

  const clave = Deno.env.get("GEMINI_API_KEY");
  if (!clave) return json({ error: "Falta poner la clave de Google AI Studio en Supabase (secreto GEMINI_API_KEY). Mira la guía del panel." }, 500);

  const sistema = `Eres el secretario del Comité de Empresa de la empresa de transporte Calsina Carré (el comité representa a toda la plantilla, no a un sindicato).
A partir del material de una reunión (fotos de notas a mano, documentos PDF o Word, o texto), redactas el borrador de un acta para publicarlo en la web del comité para los trabajadores.
Reglas:
- Lee con atención las fotos y documentos, aunque la letra sea a mano o la foto esté torcida. Si una parte no se lee bien, no la adivines.
- Escribe en español de España, en tono formal pero claro, para que lo entienda cualquier trabajador.
- No inventes nada: ni nombres, ni cifras, ni fechas, ni acuerdos que no estén en el material. Si algo no está claro, no lo pongas.
- No incluyas datos personales sensibles de trabajadores concretos (salud, sanciones, afiliación, conflictos personales). Si aparecen, resúmelos sin identificar a nadie.
- titulo: corto, máximo 80 caracteres. Ej: "Reunión ordinaria del comité de empresa".
- tipo: elige exactamente uno de esta lista: ${tipos.join(" | ") || "(libre)"}.
- fecha: si el material la dice, en formato AAAA-MM-DD (hoy es ${hoy}; úsalo para entender "ayer", "el lunes", etc.). Si no se puede saber, cadena vacía.
- resumen: 2 a 5 frases sobre de qué se habló.
- acuerdos: solo decisiones o compromisos concretos, una línea por acuerdo empezando por "- " y separadas por saltos de línea. Si no hubo acuerdos, cadena vacía.
- avisos: si falta información importante (fecha, asistentes…) o hay partes que no se leen, indícalo en una frase para que el secretario lo revise. Si no, cadena vacía.`;

  const esquema = {
    type: "OBJECT",
    properties: {
      titulo: { type: "STRING" },
      tipo: tipos.length ? { type: "STRING", enum: tipos } : { type: "STRING" },
      fecha: { type: "STRING" }, resumen: { type: "STRING" }, acuerdos: { type: "STRING" }, avisos: { type: "STRING" },
    },
    required: ["titulo", "tipo", "fecha", "resumen", "acuerdos", "avisos"],
  };
  const partes: unknown[] = [];
  if (notas) partes.push({ text: `Notas y textos de la reunión:\n"""\n${notas}\n"""` });
  archivos.forEach((a, i) => {
    partes.push({ text: `Archivo ${i + 1}${a.nombre ? " (" + a.nombre + ")" : ""}:` });
    partes.push({ inlineData: { mimeType: a.mime, data: a.data } });
  });
  partes.push({ text: "Redacta el acta a partir de todo este material." });

  let ultimo = "";
  for (const modelo of MODELOS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": clave, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: partes }],
        generationConfig: { responseMimeType: "application/json", responseSchema: esquema, temperature: 0.3 },
      }),
    });
    if (!r.ok) {
      ultimo = `${r.status} ${await r.text()}`;
      console.error("Gemini", modelo, ultimo.slice(0, 500));
      if (r.status === 400 && /API key/i.test(ultimo)) return json({ error: "La clave de Google AI Studio no es válida." }, 502);
      if (r.status === 403) return json({ error: "La clave de Google AI Studio no tiene permiso. Revisa que esté bien copiada." }, 502);
      continue;
    }
    const res = await r.json();
    const texto = (res.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    try {
      const a = JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      for (const k of ["titulo", "tipo", "fecha", "resumen", "acuerdos", "avisos"]) a[k] = typeof a[k] === "string" ? a[k].trim() : "";
      if (a.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(a.fecha)) a.fecha = "";
      if (tipos.length && !tipos.includes(a.tipo)) a.tipo = tipos[0];
      return json({ acta: a });
    } catch {
      ultimo = "respuesta no válida";
      console.error("Gemini JSON", modelo, texto.slice(0, 300));
    }
  }
  const msg = /429/.test(ultimo) ? "Se ha llegado al límite gratuito de hoy del asistente. Prueba mañana o rellena el acta a mano."
    : "El asistente no ha podido generar el acta. Vuelve a probar en un momento.";
  return json({ error: msg }, 502);
});
