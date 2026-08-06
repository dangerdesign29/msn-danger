CREATE TABLE public.push_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_assinaturas TO authenticated;
GRANT ALL ON public.push_assinaturas TO service_role;

ALTER TABLE public.push_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_select_proprio" ON public.push_assinaturas
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "push_insert_proprio" ON public.push_assinaturas
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "push_update_proprio" ON public.push_assinaturas
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "push_delete_proprio" ON public.push_assinaturas
  FOR DELETE TO authenticated USING (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;

CREATE TRIGGER push_assinaturas_touch BEFORE UPDATE ON public.push_assinaturas
FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

CREATE OR REPLACE FUNCTION public.membros_grupo(_grupo uuid)
RETURNS TABLE(id uuid, nome text, email text, avatar_url text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome, p.email, p.avatar_url, p.status
  FROM public.grupo_membros m
  JOIN public.perfis p ON p.id = m.usuario_id
  WHERE m.grupo_id = _grupo AND public.sou_membro(_grupo)
  ORDER BY p.nome;
$$;

CREATE OR REPLACE FUNCTION public.adicionar_membro(_grupo uuid, _usuario uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.sou_membro(_grupo) THEN RETURN 'sem_permissao'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = _usuario) THEN RETURN 'nao_encontrado'; END IF;
  INSERT INTO public.grupo_membros (grupo_id, usuario_id) VALUES (_grupo, _usuario) ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.sair_grupo(_grupo uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.grupo_membros WHERE grupo_id = _grupo AND usuario_id = auth.uid();
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.membros_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.adicionar_membro(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sair_grupo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.membros_grupo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_membro(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sair_grupo(uuid) TO authenticated;