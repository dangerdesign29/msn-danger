ALTER TABLE public.contatos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contatos;