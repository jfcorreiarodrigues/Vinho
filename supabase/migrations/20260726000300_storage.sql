-- VinhaVibe — bucket de etiquetas
--
-- Face à spec, as políticas passam a ser por pasta: cada utilizador escreve
-- apenas em `wine-labels/<user_id>/...`. A spec permitia a qualquer
-- autenticado escrever em qualquer caminho do bucket, o que deixava um
-- utilizador sobrepor as etiquetas de outro.
-- Faltavam também políticas de UPDATE e DELETE — sem elas ninguém conseguia
-- substituir nem remover as próprias imagens.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wine-labels',
  'wine-labels',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Etiquetas são públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wine-labels');

CREATE POLICY "Utilizador carrega para a própria pasta"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wine-labels'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Utilizador substitui as próprias etiquetas"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'wine-labels'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Utilizador apaga as próprias etiquetas"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'wine-labels'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
