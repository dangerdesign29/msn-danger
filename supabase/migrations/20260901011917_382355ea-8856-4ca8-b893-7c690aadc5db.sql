GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.sou_membro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.eh_meu_contato(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.compartilha_grupo(uuid) TO authenticated;