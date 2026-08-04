REVOKE EXECUTE ON FUNCTION public.sou_membro(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.compartilha_grupo(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.buscar_usuarios(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.adicionar_contato_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.criar_grupo(text, uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.adicionar_contato(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.eh_meu_contato(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.sou_membro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compartilha_grupo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_usuarios(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_contato_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_grupo(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_contato(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_meu_contato(uuid) TO authenticated;