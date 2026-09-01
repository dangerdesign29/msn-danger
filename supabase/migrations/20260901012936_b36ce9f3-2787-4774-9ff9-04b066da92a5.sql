CREATE TABLE public.chamada_sinais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('chamada-oferta', 'chamada-resposta', 'chamada-ice', 'chamada-fim', 'chamada-recusada')),
  payload jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '2 minutes')
);

GRANT SELECT, INSERT, DELETE ON public.chamada_sinais TO authenticated;
GRANT ALL ON public.chamada_sinais TO service_role;

ALTER TABLE public.chamada_sinais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chamada_sinais_ver_participante"
ON public.chamada_sinais FOR SELECT TO authenticated
USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

CREATE POLICY "chamada_sinais_enviar"
ON public.chamada_sinais FOR INSERT TO authenticated
WITH CHECK (auth.uid() = remetente_id AND remetente_id <> destinatario_id);

CREATE POLICY "chamada_sinais_excluir_destinatario"
ON public.chamada_sinais FOR DELETE TO authenticated
USING (auth.uid() = destinatario_id OR auth.uid() = remetente_id);

CREATE INDEX chamada_sinais_destinatario_criado_idx
ON public.chamada_sinais (destinatario_id, criado_em DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chamada_sinais;