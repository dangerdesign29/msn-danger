REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.eh_meu_contato(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.adicionar_contato(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.adicionar_contato(text) TO authenticated;