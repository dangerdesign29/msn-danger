CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.sou_membro(_grupo uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.grupo_membros WHERE grupo_id = _grupo AND usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.eh_meu_contato(_outro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.contatos WHERE usuario_id = auth.uid() AND contato_id = _outro
  );
$$;

CREATE OR REPLACE FUNCTION private.compartilha_grupo(_outro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.grupo_membros a
    JOIN public.grupo_membros b ON a.grupo_id = b.grupo_id
    WHERE a.usuario_id = auth.uid() AND b.usuario_id = _outro
  );
$$;

REVOKE ALL ON FUNCTION private.sou_membro(uuid), private.eh_meu_contato(uuid), private.compartilha_grupo(uuid) FROM PUBLIC;

-- recreate policies to use the private helpers
DROP POLICY IF EXISTS grupos_select_membro ON public.grupos;
CREATE POLICY grupos_select_membro ON public.grupos FOR SELECT TO authenticated
  USING ((dono_id = auth.uid()) OR private.sou_membro(id));

DROP POLICY IF EXISTS membros_select ON public.grupo_membros;
CREATE POLICY membros_select ON public.grupo_membros FOR SELECT TO authenticated
  USING ((usuario_id = auth.uid()) OR private.sou_membro(grupo_id));

DROP POLICY IF EXISTS membros_insert ON public.grupo_membros;
CREATE POLICY membros_insert ON public.grupo_membros FOR INSERT TO authenticated
  WITH CHECK (private.sou_membro(grupo_id) OR EXISTS (
    SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.dono_id = auth.uid()
  ));

DROP POLICY IF EXISTS mensagens_insert_remetente ON public.mensagens;
CREATE POLICY mensagens_insert_remetente ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK ((remetente_id = auth.uid()) AND ((destinatario_id IS NOT NULL) OR ((grupo_id IS NOT NULL) AND private.sou_membro(grupo_id))));

DROP POLICY IF EXISTS mensagens_select_participante ON public.mensagens;
CREATE POLICY mensagens_select_participante ON public.mensagens FOR SELECT TO authenticated
  USING ((remetente_id = auth.uid()) OR (destinatario_id = auth.uid()) OR ((grupo_id IS NOT NULL) AND private.sou_membro(grupo_id)));

DROP POLICY IF EXISTS mensagens_update_participante ON public.mensagens;
CREATE POLICY mensagens_update_participante ON public.mensagens FOR UPDATE TO authenticated
  USING ((destinatario_id = auth.uid()) OR ((grupo_id IS NOT NULL) AND private.sou_membro(grupo_id)))
  WITH CHECK ((destinatario_id = auth.uid()) OR ((grupo_id IS NOT NULL) AND private.sou_membro(grupo_id)));

DROP POLICY IF EXISTS perfis_select_proprio_ou_contato ON public.perfis;
CREATE POLICY perfis_select_proprio_ou_contato ON public.perfis FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR private.eh_meu_contato(id) OR private.compartilha_grupo(id));

-- update remaining public RPCs to use the private helper
CREATE OR REPLACE FUNCTION public.adicionar_membro(_grupo uuid, _usuario uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF NOT private.sou_membro(_grupo) THEN RETURN 'sem_permissao'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = _usuario) THEN RETURN 'nao_encontrado'; END IF;
  INSERT INTO public.grupo_membros (grupo_id, usuario_id) VALUES (_grupo, _usuario) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.membros_grupo(_grupo uuid)
RETURNS TABLE(id uuid, nome text, email text, avatar_url text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.nome, p.email, p.avatar_url, p.status
  FROM public.grupo_membros m
  JOIN public.perfis p ON p.id = m.usuario_id
  WHERE m.grupo_id = _grupo AND auth.uid() IS NOT NULL AND private.sou_membro(_grupo)
  ORDER BY p.nome;
$$;

-- drop the now-unused / API-exposed definer helpers
DROP POLICY IF EXISTS anexos_select_participante ON storage.objects;
CREATE POLICY anexos_select_participante ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'anexos') AND (((storage.foldername(name))[1] = (auth.uid())::text) OR EXISTS (
    SELECT 1 FROM public.mensagens m
    WHERE m.anexo_url = objects.name
      AND ((m.destinatario_id = auth.uid()) OR (m.remetente_id = auth.uid()) OR ((m.grupo_id IS NOT NULL) AND private.sou_membro(m.grupo_id)))
  )));

DROP FUNCTION IF EXISTS public.sou_membro(uuid);
DROP FUNCTION IF EXISTS public.eh_meu_contato(uuid);
DROP FUNCTION IF EXISTS public.compartilha_grupo(uuid);
DROP FUNCTION IF EXISTS public.adicionar_contato(text);