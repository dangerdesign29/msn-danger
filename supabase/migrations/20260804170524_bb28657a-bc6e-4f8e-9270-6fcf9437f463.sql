CREATE POLICY "anexos_insert_propria_pasta" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "anexos_update_proprio" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "anexos_delete_proprio" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "anexos_select_participante" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'anexos' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.mensagens m
        WHERE m.anexo_url = storage.objects.name
          AND (m.destinatario_id = auth.uid() OR m.remetente_id = auth.uid()
               OR (m.grupo_id IS NOT NULL AND public.sou_membro(m.grupo_id)))
      )
    )
  );