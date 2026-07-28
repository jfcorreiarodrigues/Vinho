-- Preço de referência derivado da comunidade.
--
-- PORQUÊ: a API do Wine-Searcher não tem acesso self-serve. Sem ela, o
-- "preço de mercado em tempo real" — que é um dos diferenciadores da app e
-- um argumento do plano Premium — simplesmente não existe.
--
-- Esta função resolve o problema com dados que a app já tem: os preços de
-- compra que os próprios utilizadores registam. Não substitui uma cotação
-- de leilão, mas dá uma referência real do que se paga em Portugal, é
-- gratuita, e melhora sozinha à medida que a base cresce.
--
-- PRIVACIDADE: é o ponto sensível. Um utilizador não pode ver o que outro
-- pagou. Três salvaguardas:
--   1. só devolve agregados — mediana, mínimo, máximo — nunca linhas;
--   2. exige pelo menos MIN_AMOSTRAS utilizadores DISTINTOS, senão devolve
--      vazio. Com 1 ou 2 utilizadores, a mediana revelaria o preço de
--      alguém em concreto;
--   3. nunca devolve identificadores de utilizador.
--
-- SECURITY DEFINER é necessário: a função tem de ler para além do RLS de
-- `wines`, que restringe cada utilizador à sua cave. É o único sítio do
-- schema onde isso acontece, e é por isso que as salvaguardas acima estão
-- todas dentro da própria função e não dependem de quem a chama.
--
-- O Supabase Advisor vai assinalar esta função como SECURITY DEFINER
-- invocável — ao contrário das funções de trigger, esta é para ser mesmo
-- invocada. É uma excepção consciente, não um descuido.

CREATE OR REPLACE FUNCTION public.preco_comunidade(
  p_producer TEXT,
  p_name     TEXT,
  p_vintage  INTEGER DEFAULT NULL
)
RETURNS TABLE (
  mediana   NUMERIC,
  minimo    NUMERIC,
  maximo    NUMERIC,
  amostras  INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY w.purchase_price)::NUMERIC, 2),
    ROUND(MIN(w.purchase_price)::NUMERIC, 2),
    ROUND(MAX(w.purchase_price)::NUMERIC, 2),
    COUNT(DISTINCT w.user_id)::INTEGER
  FROM public.wines w
  WHERE w.purchase_price IS NOT NULL
    AND w.purchase_price > 0
    AND lower(trim(w.producer)) = lower(trim(p_producer))
    AND lower(trim(w.name))     = lower(trim(p_name))
    AND (p_vintage IS NULL OR w.vintage = p_vintage)
  HAVING COUNT(DISTINCT w.user_id) >= 3;
$$;

COMMENT ON FUNCTION public.preco_comunidade IS
  'Referência de preço agregada. Só devolve resultado com 3 ou mais utilizadores distintos, para não expor o preço pago por ninguém em concreto.';

-- Só quem está autenticado. O `anon` não tem nada que consultar preços.
--
-- É preciso revogar das DUAS origens. Em Postgres o EXECUTE chega por
-- herança de PUBLIC, mas o Supabase concede-o também nominalmente a `anon`
-- e `authenticated` através de default privileges. Revogar só de PUBLIC
-- deixa o grant nominal intacto — e foi exactamente o que aconteceu na
-- primeira tentativa: o `anon` continuava a conseguir invocar a função.
--
-- É a terceira variante da mesma armadilha neste schema, depois do
-- REVOKE UPDATE por coluna e do REVOKE EXECUTE nas funções de trigger.
-- Regra prática: um privilégio pode vir de PUBLIC, de um grant nominal ou
-- de default privileges, e um revoke só apaga a origem que nomeia.
REVOKE EXECUTE ON FUNCTION public.preco_comunidade(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.preco_comunidade(TEXT, TEXT, INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION public.preco_comunidade(TEXT, TEXT, INTEGER) TO authenticated;

-- Acelera o agrupamento por vinho, que é como a função procura.
CREATE INDEX IF NOT EXISTS wines_identidade_idx
  ON public.wines (lower(trim(producer)), lower(trim(name)), vintage)
  WHERE purchase_price IS NOT NULL;
