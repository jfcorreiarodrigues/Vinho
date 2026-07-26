-- VinhaVibe — Row Level Security
--
-- Correcções face à secção 5 da especificação:
--
--   * `post_likes` e `follows` não tinham RLS activo. Sem RLS, qualquer pessoa
--     com a anon key podia inserir e apagar likes e follows em nome de
--     terceiros — a anon key está no bundle da app, portanto é pública.
--   * `posts` só tinha políticas de SELECT e INSERT. Com RLS activo e sem
--     política de UPDATE/DELETE, ninguém conseguia editar nem apagar os
--     próprios posts (mas a UI tem o menu "···" que promete isso).
--   * `profiles` usava `FOR ALL USING (auth.uid() = id)`, que também restringe
--     o SELECT — o feed social não conseguia ler o autor de cada post.
--
-- Nota de performance: `auth.uid()` é envolvido em subquery para o planeador
-- o avaliar uma vez por query em vez de uma vez por linha.

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows       ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------- --
-- profiles — legível por qualquer autenticado, escrito só pelo próprio
-- ---------------------------------------------------------------- --

CREATE POLICY "Perfis visíveis para autenticados"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Utilizador cria o próprio perfil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Utilizador actualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Utilizador apaga o próprio perfil"
  ON public.profiles FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- O plano é alterado pelo webhook do Stripe (service role), nunca pelo
-- cliente. Sem isto, qualquer utilizador se promovia a premium com um UPDATE.
--
-- Atenção: `REVOKE UPDATE (plan)` sozinho não chega. Um revoke ao nível da
-- coluna não subtrai nada a um GRANT ao nível da tabela, e o Supabase concede
-- `GRANT ALL ON ALL TABLES` a `anon`/`authenticated` por omissão — o revoke
-- ficava a não fazer absolutamente nada. É preciso tirar o UPDATE da tabela
-- e voltar a concedê-lo só nas colunas seguras.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT  UPDATE (name, avatar_url, location) ON public.profiles TO authenticated;

-- ---------------------------------------------------------------- --
-- user_settings — estritamente privado
-- ---------------------------------------------------------------- --

CREATE POLICY "Definições só do próprio"
  ON public.user_settings FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Mesmo raciocínio: tirar o UPDATE da tabela e reconceder só o que o cliente
-- pode escrever. `stripe_customer_id` fica reservado ao webhook.
REVOKE UPDATE ON public.user_settings FROM authenticated, anon;
GRANT  UPDATE (email, preferences, expo_push_token)
  ON public.user_settings TO authenticated;

-- ---------------------------------------------------------------- --
-- wines — cave privada
-- ---------------------------------------------------------------- --

CREATE POLICY "Utilizador gere os próprios vinhos"
  ON public.wines FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------- --
-- posts — leitura pública (entre autenticados), escrita só do autor
-- ---------------------------------------------------------------- --

CREATE POLICY "Posts visíveis para autenticados"
  ON public.posts FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Utilizador cria os próprios posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Utilizador edita os próprios posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Utilizador apaga os próprios posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- `likes` é mantido pelo trigger sync_post_likes. Se o cliente pudesse
-- escrevê-lo, bastava um UPDATE para inflacionar o contador.
REVOKE UPDATE ON public.posts FROM authenticated, anon;
GRANT  UPDATE (wine_name, producer, region, vintage, rating, note, occasion, mood, is_pureza, image_url)
  ON public.posts TO authenticated;

-- ---------------------------------------------------------------- --
-- post_likes — cada um gere os seus próprios likes
-- ---------------------------------------------------------------- --

CREATE POLICY "Likes visíveis para autenticados"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Utilizador dá like em nome próprio"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Utilizador remove o próprio like"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------- --
-- follows — cada um gere quem segue
-- ---------------------------------------------------------------- --

CREATE POLICY "Follows visíveis para autenticados"
  ON public.follows FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Utilizador segue em nome próprio"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = follower_id);

CREATE POLICY "Utilizador deixa de seguir"
  ON public.follows FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = follower_id);
