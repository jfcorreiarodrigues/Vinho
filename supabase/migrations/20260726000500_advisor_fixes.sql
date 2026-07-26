-- Correcções levantadas pelo Supabase Advisor depois de aplicar o schema
-- num projecto real. Nenhuma delas aparecia nos testes locais, porque o
-- Advisor analisa a exposição via PostgREST e via API de Storage, que o
-- shim de testes não reproduz.

-- ---------------------------------------------------------------- --
-- 1. O bucket público não precisa de política de SELECT
-- ---------------------------------------------------------------- --
--
-- Aviso: `public_bucket_allows_listing`.
--
-- Num bucket público os ficheiros já são servidos pelo URL público sem
-- passar por RLS. A política ampla de SELECT não acrescenta acesso nenhum
-- ao que interessa — mas habilita a *listagem* do bucket.
--
-- Como o caminho de cada ficheiro é `wine-labels/<user_id>/...`, listar o
-- bucket equivale a enumerar os user_id de todos os utilizadores e as
-- etiquetas de cada um. Não é isso que queremos expor.

DROP POLICY IF EXISTS "Etiquetas são públicas para leitura" ON storage.objects;

-- ---------------------------------------------------------------- --
-- 2. Funções de trigger não devem ser invocáveis por RPC
-- ---------------------------------------------------------------- --
--
-- Avisos: `anon_security_definer_function_executable` e a variante para
-- `authenticated`.
--
-- Estando no schema `public`, o PostgREST expõe estas funções como
-- endpoints `/rest/v1/rpc/<nome>`. Na prática o Postgres recusa executar
-- uma função de trigger fora de um trigger, portanto não são exploráveis
-- — mas são SECURITY DEFINER e não há motivo nenhum para estarem ao
-- alcance de quem quer que seja. Revogar é gratuito.
--
-- Tem de ser `FROM PUBLIC`, não `FROM anon, authenticated`: em Postgres
-- toda a função nasce com EXECUTE concedido a PUBLIC, e as duas roles
-- herdam-no daí. Revogar das roles nominalmente não retira nada — foi
-- verificado contra o Advisor, que continuou a assinalar o problema até
-- o revoke passar a ser de PUBLIC.
--
-- É a mesma armadilha do `REVOKE UPDATE (coluna)` em
-- 20260726000200_rls_policies.sql: revogar do sítio errado não faz nada
-- e não dá erro nenhum a avisar.

REVOKE EXECUTE ON FUNCTION public.handle_new_user()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_post_likes()         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_free_plan_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()          FROM PUBLIC;
