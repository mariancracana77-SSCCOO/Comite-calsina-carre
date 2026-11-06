-- Copia de la función tal como estaba antes de «Mis tareas» (5/11/2026). Para volver atrás: ejecutar esto
-- y "drop trigger if exists peticiones_avisa_lorena on public.peticiones_claude;" (las columnas nuevas no molestan).
CREATE OR REPLACE FUNCTION public.peticiones_avisa_padre()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ult jsonb; n_new int := jsonb_array_length(coalesce(new.mensajes, '[]'::jsonb)); n_old int := jsonb_array_length(coalesce(old.mensajes, '[]'::jsonb));
begin
  if n_new <= n_old then return new; end if;
  ult := new.mensajes -> (n_new - 1);
  if coalesce(ult->>'quien', '') <> 'claude' or not exists (select 1 from public.push_admin) then return new; end if;
  perform net.http_post(
    url := 'https://ytxpubqyhnohhugpukdm.supabase.co/functions/v1/avisar-padre',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select valor from public.config_privada where clave = 'cron_secreto')),
    body := jsonb_build_object(
      'titulo', case when new.estado = 'lista' and new.propuesta is not null and new.decision is null then 'Te toca a ti: petición n.º ' || new.id else 'Claude te ha contestado (petición n.º ' || new.id || ')' end,
      'cuerpo', left(coalesce(ult->>'texto', ''), 180),
      'url', 'admin.html#peticiones'),
    timeout_milliseconds := 30000);
  return new;
end $function$;
