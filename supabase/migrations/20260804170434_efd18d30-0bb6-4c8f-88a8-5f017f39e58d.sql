-- ============ GRUPOS ============
CREATE TABLE public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  avatar_url text,
  dono_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grupo_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entrou_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, usuario_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT ALL ON public.grupos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_membros TO authenticated;
GRANT ALL ON public.grupo_membros TO service_role;

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_membros ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sou_membro(_grupo uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.grupo_membros WHERE grupo_id = _grupo AND usuario_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.compartilha_grupo(_outro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grupo_membros a
    JOIN public.grupo_membros b ON a.grupo_id = b.grupo_id
    WHERE a.usuario_id = auth.uid() AND b.usuario_id = _outro
  );
$$;

CREATE POLICY grupos_select_membro ON public.grupos FOR SELECT TO authenticated
  USING (dono_id = auth.uid() OR public.sou_membro(id));
CREATE POLICY grupos_insert_dono ON public.grupos FOR INSERT TO authenticated
  WITH CHECK (dono_id = auth.uid());
CREATE POLICY grupos_update_dono ON public.grupos FOR UPDATE TO authenticated
  USING (dono_id = auth.uid()) WITH CHECK (dono_id = auth.uid());
CREATE POLICY grupos_delete_dono ON public.grupos FOR DELETE TO authenticated
  USING (dono_id = auth.uid());

CREATE POLICY membros_select ON public.grupo_membros FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.sou_membro(grupo_id));
CREATE POLICY membros_insert ON public.grupo_membros FOR INSERT TO authenticated
  WITH CHECK (public.sou_membro(grupo_id) OR EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.dono_id = auth.uid()));
CREATE POLICY membros_delete ON public.grupo_membros FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.dono_id = auth.uid()));

-- ============ MENSAGENS ============
ALTER TABLE public.mensagens
  ALTER COLUMN destinatario_id DROP NOT NULL,
  ADD COLUMN grupo_id uuid REFERENCES public.grupos(id) ON DELETE CASCADE,
  ADD COLUMN anexo_url text,
  ADD COLUMN anexo_nome text,
  ADD COLUMN anexo_tipo text,
  ADD COLUMN anexo_tamanho bigint,
  ADD COLUMN entregue_em timestamptz,
  ADD COLUMN lida_em timestamptz;

CREATE INDEX idx_mensagens_grupo ON public.mensagens (grupo_id, enviada_em DESC);
CREATE INDEX idx_mensagens_dupla ON public.mensagens (remetente_id, destinatario_id, enviada_em DESC);

DROP POLICY IF EXISTS mensagens_select_participante ON public.mensagens;
DROP POLICY IF EXISTS mensagens_insert_remetente ON public.mensagens;
DROP POLICY IF EXISTS mensagens_update_destinatario ON public.mensagens;

CREATE POLICY mensagens_select_participante ON public.mensagens FOR SELECT TO authenticated
  USING (remetente_id = auth.uid() OR destinatario_id = auth.uid() OR (grupo_id IS NOT NULL AND public.sou_membro(grupo_id)));
CREATE POLICY mensagens_insert_remetente ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK (remetente_id = auth.uid() AND (destinatario_id IS NOT NULL OR (grupo_id IS NOT NULL AND public.sou_membro(grupo_id))));
CREATE POLICY mensagens_update_participante ON public.mensagens FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid() OR (grupo_id IS NOT NULL AND public.sou_membro(grupo_id)))
  WITH CHECK (destinatario_id = auth.uid() OR (grupo_id IS NOT NULL AND public.sou_membro(grupo_id)));

-- ============ PERFIS ============
ALTER TABLE public.perfis ADD COLUMN tema jsonb;

DROP POLICY IF EXISTS perfis_select_proprio_ou_contato ON public.perfis;
CREATE POLICY perfis_select_proprio_ou_contato ON public.perfis FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.eh_meu_contato(id) OR public.compartilha_grupo(id));

-- ============ BUSCA DE USUARIOS ============
CREATE OR REPLACE FUNCTION public.buscar_usuarios(_termo text)
RETURNS TABLE (id uuid, nome text, email text, avatar_url text, status text, ja_contato boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome, p.email, p.avatar_url, p.status,
         EXISTS (SELECT 1 FROM public.contatos c WHERE c.usuario_id = auth.uid() AND c.contato_id = p.id)
  FROM public.perfis p
  WHERE p.id <> auth.uid()
    AND length(trim(_termo)) >= 2
    AND (p.nome ILIKE '%' || trim(_termo) || '%' OR lower(p.email) = lower(trim(_termo)))
  ORDER BY p.nome
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.adicionar_contato_id(_alvo uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _alvo = auth.uid() THEN RETURN 'voce_mesmo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = _alvo) THEN RETURN 'nao_encontrado'; END IF;
  INSERT INTO public.contatos (usuario_id, contato_id) VALUES (auth.uid(), _alvo) ON CONFLICT DO NOTHING;
  INSERT INTO public.contatos (usuario_id, contato_id) VALUES (_alvo, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_grupo(_nome text, _membros uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _m uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  INSERT INTO public.grupos (nome, dono_id) VALUES (coalesce(nullif(trim(_nome), ''), 'Novo grupo'), auth.uid())
    RETURNING id INTO _id;
  INSERT INTO public.grupo_membros (grupo_id, usuario_id) VALUES (_id, auth.uid());
  FOREACH _m IN ARRAY coalesce(_membros, ARRAY[]::uuid[]) LOOP
    IF _m <> auth.uid() AND EXISTS (SELECT 1 FROM public.perfis WHERE id = _m) THEN
      INSERT INTO public.grupo_membros (grupo_id, usuario_id) VALUES (_id, _m) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN _id;
END;
$$;

-- ============ REALTIME ============
ALTER TABLE public.mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.grupos REPLICA IDENTITY FULL;
ALTER TABLE public.grupo_membros REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grupos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grupo_membros;