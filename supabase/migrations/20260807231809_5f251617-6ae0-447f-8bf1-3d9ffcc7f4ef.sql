-- 1) Trigger-only functions: nobody should call them directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tocar_atualizado_em() FROM PUBLIC, anon, authenticated;

-- 2) Remove PUBLIC/anon execute from all other SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.adicionar_contato(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adicionar_contato_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adicionar_membro(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buscar_usuarios(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_grupo(text, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.membros_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sair_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sou_membro(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_meu_contato(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compartilha_grupo(uuid) FROM PUBLIC, anon;

-- Keep the RPCs the app needs available only to signed-in users
GRANT EXECUTE ON FUNCTION public.adicionar_contato(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_contato_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_membro(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_usuarios(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_grupo(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.membros_grupo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sair_grupo(uuid) TO authenticated;
-- Policy helper functions must stay callable by signed-in users (used inside RLS)
GRANT EXECUTE ON FUNCTION public.sou_membro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_meu_contato(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compartilha_grupo(uuid) TO authenticated;

-- 3) Explicit authentication guards inside the definer functions
CREATE OR REPLACE FUNCTION public.adicionar_contato(_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _alvo uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  SELECT id INTO _alvo FROM public.perfis WHERE lower(email) = lower(trim(_email));
  IF _alvo IS NULL THEN
    RETURN 'nao_encontrado';
  END IF;
  IF _alvo = auth.uid() THEN
    RETURN 'voce_mesmo';
  END IF;
  INSERT INTO public.contatos (usuario_id, contato_id) VALUES (auth.uid(), _alvo)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.contatos (usuario_id, contato_id) VALUES (_alvo, auth.uid())
    ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$function$;

CREATE OR REPLACE FUNCTION public.adicionar_contato_id(_alvo uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF _alvo = auth.uid() THEN RETURN 'voce_mesmo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = _alvo) THEN RETURN 'nao_encontrado'; END IF;
  INSERT INTO public.contatos (usuario_id, contato_id) VALUES (auth.uid(), _alvo) ON CONFLICT DO NOTHING;
  INSERT INTO public.contatos (usuario_id, contato_id) VALUES (_alvo, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$function$;

CREATE OR REPLACE FUNCTION public.adicionar_membro(_grupo uuid, _usuario uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF NOT public.sou_membro(_grupo) THEN RETURN 'sem_permissao'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = _usuario) THEN RETURN 'nao_encontrado'; END IF;
  INSERT INTO public.grupo_membros (grupo_id, usuario_id) VALUES (_grupo, _usuario) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$function$;

CREATE OR REPLACE FUNCTION public.sair_grupo(_grupo uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  DELETE FROM public.grupo_membros WHERE grupo_id = _grupo AND usuario_id = auth.uid();
  RETURN 'ok';
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_usuarios(_termo text)
 RETURNS TABLE(id uuid, nome text, email text, avatar_url text, status text, ja_contato boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome, p.email, p.avatar_url, p.status,
         EXISTS (SELECT 1 FROM public.contatos c WHERE c.usuario_id = auth.uid() AND c.contato_id = p.id)
  FROM public.perfis p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND length(trim(_termo)) >= 2
    AND (p.nome ILIKE '%' || trim(_termo) || '%' OR lower(p.email) = lower(trim(_termo)))
  ORDER BY p.nome
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.membros_grupo(_grupo uuid)
 RETURNS TABLE(id uuid, nome text, email text, avatar_url text, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome, p.email, p.avatar_url, p.status
  FROM public.grupo_membros m
  JOIN public.perfis p ON p.id = m.usuario_id
  WHERE m.grupo_id = _grupo AND auth.uid() IS NOT NULL AND public.sou_membro(_grupo)
  ORDER BY p.nome;
$function$;

CREATE OR REPLACE FUNCTION public.sou_membro(_grupo uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.grupo_membros WHERE grupo_id = _grupo AND usuario_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.eh_meu_contato(_outro uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contatos WHERE usuario_id = auth.uid() AND contato_id = _outro
  );
$function$;

CREATE OR REPLACE FUNCTION public.compartilha_grupo(_outro uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.grupo_membros a
    JOIN public.grupo_membros b ON a.grupo_id = b.grupo_id
    WHERE a.usuario_id = auth.uid() AND b.usuario_id = _outro
  );
$function$;

-- Re-apply grants after CREATE OR REPLACE
REVOKE ALL ON FUNCTION public.adicionar_contato(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adicionar_contato_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adicionar_membro(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buscar_usuarios(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.membros_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sair_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sou_membro(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_meu_contato(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compartilha_grupo(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.adicionar_contato(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_contato_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_membro(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_usuarios(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.membros_grupo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sair_grupo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sou_membro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_meu_contato(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compartilha_grupo(uuid) TO authenticated;