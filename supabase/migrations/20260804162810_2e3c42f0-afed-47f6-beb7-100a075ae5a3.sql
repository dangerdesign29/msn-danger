CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT 'Usuário',
  email text NOT NULL,
  avatar_url text,
  status text NOT NULL DEFAULT 'online',
  musica text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apelido text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, contato_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO authenticated;
GRANT ALL ON public.contatos TO service_role;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto',
  lida boolean NOT NULL DEFAULT false,
  enviada_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mensagens_par ON public.mensagens (remetente_id, destinatario_id, enviada_em);
CREATE INDEX idx_contatos_usuario ON public.contatos (usuario_id);

CREATE OR REPLACE FUNCTION public.eh_meu_contato(_outro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contatos
    WHERE usuario_id = auth.uid() AND contato_id = _outro
  );
$$;

CREATE POLICY "perfis_select_proprio_ou_contato" ON public.perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.eh_meu_contato(id));

CREATE POLICY "perfis_insert_proprio" ON public.perfis
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "perfis_update_proprio" ON public.perfis
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "contatos_select_proprios" ON public.contatos
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

CREATE POLICY "contatos_insert_proprios" ON public.contatos
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "contatos_update_proprios" ON public.contatos
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "contatos_delete_proprios" ON public.contatos
  FOR DELETE TO authenticated USING (usuario_id = auth.uid());

CREATE POLICY "mensagens_select_participante" ON public.mensagens
  FOR SELECT TO authenticated
  USING (remetente_id = auth.uid() OR destinatario_id = auth.uid());

CREATE POLICY "mensagens_insert_remetente" ON public.mensagens
  FOR INSERT TO authenticated WITH CHECK (remetente_id = auth.uid());

CREATE POLICY "mensagens_update_destinatario" ON public.mensagens
  FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid()) WITH CHECK (destinatario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.adicionar_contato(_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _alvo uuid;
BEGIN
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
$$;

REVOKE ALL ON FUNCTION public.adicionar_contato(text) FROM public;
GRANT EXECUTE ON FUNCTION public.adicionar_contato(text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.perfis;