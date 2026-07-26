-- Testes de RLS da VinhaVibe.
--
-- Correr com:  psql -d vinhavibe -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
--
-- Cada bloco simula um utilizador autenticado através de:
--   SET LOCAL role authenticated;
--   SET LOCAL request.jwt.claim.sub = '<user_id>';
-- que é como o PostgREST expõe o JWT ao Postgres.

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- ---------------------------------------------------------------- --
-- Dados de teste
-- ---------------------------------------------------------------- --

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@exemplo.pt',  '{"name":"Ana Silva"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bruno@exemplo.pt', '{"name":"Bruno Costa"}');

-- O trigger on_auth_user_created deve ter criado perfis e settings.
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM public.profiles) = 2,
    'handle_new_user() não criou os dois perfis';
  ASSERT (SELECT name FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Ana Silva',
    'handle_new_user() não leu o nome de raw_user_meta_data';
  ASSERT (SELECT email FROM public.user_settings WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'bruno@exemplo.pt',
    'handle_new_user() não populou user_settings';
  RAISE NOTICE 'OK  trigger de signup cria profile + user_settings';
END $$;

-- Cada utilizador com um vinho na cave.
INSERT INTO public.wines (user_id, name, producer, region, wine_type) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Redoma Tinto',  'Niepoort', 'Douro',    'tinto'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Alvarinho',     'A. Mendes','Vinho Verde','branco');

INSERT INTO public.posts (id, user_id, wine_name, rating) VALUES
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'Alvarinho', 5);

-- ---------------------------------------------------------------- --
-- 1. Isolamento da cave (checklist secção 17)
-- ---------------------------------------------------------------- --

DO $$
DECLARE n INTEGER;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  SELECT COUNT(*) INTO n FROM public.wines;
  ASSERT n = 1, format('Ana devia ver 1 vinho (o dela), viu %s', n);

  SELECT COUNT(*) INTO n FROM public.wines WHERE name = 'Alvarinho';
  ASSERT n = 0, 'FALHA CRÍTICA: Ana consegue ver a cave do Bruno';

  RAISE NOTICE 'OK  utilizador A não vê a cave do utilizador B';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 2. O feed social consegue ler o autor (o bug do FOR ALL da spec)
-- ---------------------------------------------------------------- --

DO $$
DECLARE autor TEXT;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  SELECT p.name INTO autor
  FROM public.posts po JOIN public.profiles p ON p.id = po.user_id
  WHERE po.id = 'cccccccc-0000-0000-0000-000000000003';

  ASSERT autor = 'Bruno Costa',
    'FALHA: o feed não consegue ler o autor do post — era este o bug do FOR ALL';

  RAISE NOTICE 'OK  feed social lê o perfil de outros utilizadores';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 3. Emails continuam privados
-- ---------------------------------------------------------------- --

DO $$
DECLARE n INTEGER;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  SELECT COUNT(*) INTO n FROM public.user_settings;
  ASSERT n = 1, format('Ana devia ver só as suas definições, viu %s', n);

  SELECT COUNT(*) INTO n FROM public.user_settings WHERE email = 'bruno@exemplo.pt';
  ASSERT n = 0, 'FALHA CRÍTICA: emails de outros utilizadores estão expostos';

  RAISE NOTICE 'OK  emails de terceiros não são legíveis';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 4. Não é possível dar like em nome de outro
-- ---------------------------------------------------------------- --

DO $$
DECLARE violou BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  BEGIN
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002');
    violou := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- esperado
  END;

  ASSERT NOT violou, 'FALHA CRÍTICA: Ana deu like em nome do Bruno';
  RAISE NOTICE 'OK  like em nome de terceiro é bloqueado';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 5. Contador de likes mantido pelo trigger
-- ---------------------------------------------------------------- --

DO $$
DECLARE n INTEGER;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  INSERT INTO public.post_likes (post_id, user_id)
  VALUES ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');
  RESET role;

  SELECT likes INTO n FROM public.posts WHERE id = 'cccccccc-0000-0000-0000-000000000003';
  ASSERT n = 1, format('likes devia ser 1 depois do insert, é %s', n);

  DELETE FROM public.post_likes
  WHERE post_id = 'cccccccc-0000-0000-0000-000000000003'
    AND user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  SELECT likes INTO n FROM public.posts WHERE id = 'cccccccc-0000-0000-0000-000000000003';
  ASSERT n = 0, format('likes devia voltar a 0, é %s', n);

  RAISE NOTICE 'OK  posts.likes sincroniza com post_likes';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 6. Utilizador não se promove a premium
-- ---------------------------------------------------------------- --

DO $$
DECLARE violou BOOLEAN := FALSE; plano public.user_plan;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  BEGIN
    UPDATE public.profiles SET plan = 'premium'
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
    violou := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- esperado: REVOKE UPDATE (plan)
  END;

  RESET role;
  SELECT plan INTO plano FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
  ASSERT NOT violou AND plano = 'free',
    'FALHA CRÍTICA: utilizador promoveu-se a premium sem passar pelo Stripe';

  RAISE NOTICE 'OK  plano não é escrito pelo cliente';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 7. Não é possível inflacionar o contador de likes
-- ---------------------------------------------------------------- --

DO $$
DECLARE violou BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);

  BEGIN
    UPDATE public.posts SET likes = 9999
    WHERE id = 'cccccccc-0000-0000-0000-000000000003';
    violou := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- esperado: REVOKE UPDATE (likes)
  END;

  ASSERT NOT violou, 'FALHA: o autor conseguiu escrever directamente em posts.likes';
  RAISE NOTICE 'OK  posts.likes não é escrito pelo cliente';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 8. Limite do plano free imposto no servidor
-- ---------------------------------------------------------------- --

DO $$
DECLARE bloqueou BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  -- A Ana já tem 1 garrafa; subir para 50 tem de passar.
  UPDATE public.wines SET quantity = 50
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  -- A 51.ª garrafa, num vinho novo, tem de ser recusada.
  BEGIN
    INSERT INTO public.wines (user_id, name, producer, region, quantity)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Vinho extra', 'Produtor', 'Douro', 1);
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%LIMITE_PLANO_FREE%', 'erro inesperado: ' || SQLERRM;
    bloqueou := TRUE;
  END;
  ASSERT bloqueou, 'FALHA: plano free aceitou a 51.a garrafa';

  RAISE NOTICE 'OK  limite de 50 garrafas do plano free é imposto na BD';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 8b. A fuga do UPDATE: subir a quantidade tem de ser bloqueada
-- ---------------------------------------------------------------- --

DO $$
DECLARE bloqueou BOOLEAN := FALSE; qtd INTEGER;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  BEGIN
    UPDATE public.wines SET quantity = 500
    WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM LIKE '%LIMITE_PLANO_FREE%', 'erro inesperado: ' || SQLERRM;
    bloqueou := TRUE;
  END;

  ASSERT bloqueou, 'FALHA CRÍTICA: UPDATE contorna o limite do plano free';

  RESET role;
  SELECT SUM(quantity) INTO qtd FROM public.wines
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  ASSERT qtd = 50, format('quantidade devia continuar 50, é %s', qtd);

  RAISE NOTICE 'OK  UPDATE não contorna o limite do plano free';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 9. Storage: escrita confinada à pasta do próprio
-- ---------------------------------------------------------------- --

DO $$
DECLARE violou BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

  -- Na própria pasta: permitido.
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('wine-labels', 'aaaaaaaa-0000-0000-0000-000000000001/etiqueta.jpg');

  -- Na pasta do Bruno: bloqueado.
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('wine-labels', 'bbbbbbbb-0000-0000-0000-000000000002/intruso.jpg');
    violou := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- esperado
  END;

  ASSERT NOT violou, 'FALHA CRÍTICA: Ana escreveu na pasta de etiquetas do Bruno';
  RAISE NOTICE 'OK  storage confinado à pasta do próprio utilizador';
END $$;
RESET role;

-- ---------------------------------------------------------------- --
-- 10. Nenhuma tabela pública sem RLS
-- ---------------------------------------------------------------- --

DO $$
DECLARE sem_rls TEXT;
BEGIN
  SELECT string_agg(tablename, ', ') INTO sem_rls
  FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;

  ASSERT sem_rls IS NULL, 'Tabelas públicas sem RLS: ' || COALESCE(sem_rls, '');
  RAISE NOTICE 'OK  todas as tabelas públicas têm RLS activo';
END $$;

ROLLBACK;
