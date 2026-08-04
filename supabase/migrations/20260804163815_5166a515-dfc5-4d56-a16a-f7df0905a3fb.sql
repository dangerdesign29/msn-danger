GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO authenticated;
GRANT ALL ON public.contatos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
GRANT EXECUTE ON FUNCTION public.adicionar_contato(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_meu_contato(uuid) TO authenticated;