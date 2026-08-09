ALTER TABLE public.mensagens ADD COLUMN IF NOT EXISTS responde_a uuid REFERENCES public.mensagens(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.reacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mensagem_id, usuario_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.reacoes TO authenticated;
GRANT ALL ON public.reacoes TO service_role;

ALTER TABLE public.reacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY reacoes_select_participante ON public.reacoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mensagens m WHERE m.id = reacoes.mensagem_id));

CREATE POLICY reacoes_insert_propria ON public.reacoes FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.mensagens m WHERE m.id = reacoes.mensagem_id));

CREATE POLICY reacoes_delete_propria ON public.reacoes FOR DELETE TO authenticated
USING (usuario_id = auth.uid());

ALTER TABLE public.reacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reacoes;