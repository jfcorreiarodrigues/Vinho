-- VinhaVibe — schema inicial
--
-- Baseado na secção 5 da especificação, com três alterações estruturais:
--
-- 1. `profiles` foi dividida em `profiles` (dados públicos, legíveis por
--    qualquer utilizador para o feed social) e `user_settings` (email, plano,
--    preferências, tokens). Na spec original tudo vivia numa tabela com
--    política `FOR ALL USING (auth.uid() = id)`, o que tornava impossível ler
--    o nome/avatar de outro utilizador — o feed social renderizava sem autor.
--    Juntar as duas coisas obrigaria a expor emails a toda a gente.
--
-- 2. `wines` ganha `wine_type`: os filtros da CaveScreen (Tintos/Brancos/
--    Rosés/Espumantes) não eram implementáveis sem coluna de cor.
--
-- 3. `posts.likes` passa a ser mantido por trigger a partir de `post_likes`.
--    Como coluna solta ia divergir do número real de likes.

-- ---------------------------------------------------------------- --
-- Extensões
-- ---------------------------------------------------------------- --

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------- --
-- Tipos
-- ---------------------------------------------------------------- --

CREATE TYPE public.wine_type AS ENUM (
  'tinto', 'branco', 'rose', 'espumante', 'fortificado'
);

CREATE TYPE public.wine_source AS ENUM (
  'manual', 'scan', 'bulk_invoice', 'shelf_scan'
);

CREATE TYPE public.user_plan AS ENUM ('free', 'premium');

-- ---------------------------------------------------------------- --
-- Perfis públicos
-- ---------------------------------------------------------------- --

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Enófilo',
  avatar_url TEXT,
  location   TEXT NOT NULL DEFAULT 'Lisboa',
  plan       public.user_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
  'Dados legíveis por qualquer utilizador autenticado. Nada de sensível aqui.';

-- ---------------------------------------------------------------- --
-- Dados privados do utilizador
-- ---------------------------------------------------------------- --

CREATE TABLE public.user_settings (
  id                 UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email              TEXT,
  preferences        JSONB NOT NULL DEFAULT '{}'::jsonb,
  expo_push_token    TEXT,
  stripe_customer_id TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_settings IS
  'Só o próprio utilizador lê/escreve. stripe_customer_id só é escrito pelo webhook (service role).';

-- ---------------------------------------------------------------- --
-- Vinhos
-- ---------------------------------------------------------------- --

CREATE TABLE public.wines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  producer                TEXT NOT NULL,
  region                  TEXT NOT NULL,
  subregion               TEXT,
  country                 TEXT NOT NULL DEFAULT 'Portugal',
  wine_type               public.wine_type NOT NULL DEFAULT 'tinto',
  grape_varieties         TEXT[] NOT NULL DEFAULT '{}',
  vintage                 INTEGER CHECK (vintage BETWEEN 1800 AND 2100),
  quantity                INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  purchase_price          DECIMAL(10,2) CHECK (purchase_price >= 0),
  purchase_date           DATE,
  current_market_value    DECIMAL(10,2) CHECK (current_market_value >= 0),
  label_image_url         TEXT,
  tasting_notes           TEXT,
  food_pairings           TEXT[] NOT NULL DEFAULT '{}',
  maturation_window_start INTEGER,
  maturation_window_end   INTEGER,
  is_natural              BOOLEAN NOT NULL DEFAULT FALSE,
  is_low_intervention     BOOLEAN NOT NULL DEFAULT FALSE,
  is_organic              BOOLEAN NOT NULL DEFAULT FALSE,
  is_biodynamic           BOOLEAN NOT NULL DEFAULT FALSE,
  pureza_score            INTEGER CHECK (pureza_score BETWEEN 0 AND 100),
  rarity_score            INTEGER CHECK (rarity_score BETWEEN 0 AND 100),
  source                  public.wine_source NOT NULL DEFAULT 'manual',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT maturation_window_coerente
    CHECK (
      maturation_window_start IS NULL
      OR maturation_window_end IS NULL
      OR maturation_window_end >= maturation_window_start
    )
);

CREATE INDEX wines_user_id_idx      ON public.wines (user_id);
CREATE INDEX wines_user_created_idx ON public.wines (user_id, created_at DESC);
CREATE INDEX wines_maturation_idx   ON public.wines (user_id, maturation_window_start)
  WHERE maturation_window_start IS NOT NULL;

-- ---------------------------------------------------------------- --
-- Social
-- ---------------------------------------------------------------- --

CREATE TABLE public.posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wine_id    UUID REFERENCES public.wines(id) ON DELETE SET NULL,
  wine_name  TEXT NOT NULL,
  producer   TEXT,
  region     TEXT,
  vintage    INTEGER,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note       TEXT,
  occasion   TEXT,
  mood       TEXT,
  is_pureza  BOOLEAN NOT NULL DEFAULT FALSE,
  image_url  TEXT,
  likes      INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX posts_user_idx    ON public.posts (user_id, created_at DESC);

CREATE TABLE public.post_likes (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX post_likes_user_idx ON public.post_likes (user_id);

CREATE TABLE public.follows (
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT nao_seguir_a_si_proprio CHECK (follower_id <> following_id)
);

CREATE INDEX follows_following_idx ON public.follows (following_id);

-- ---------------------------------------------------------------- --
-- Triggers
-- ---------------------------------------------------------------- --

-- Nota: todas as funções usam `SET search_path = ''` e nomes qualificados.
-- Sem isso, uma função SECURITY DEFINER fica exposta a search_path injection
-- (é o aviso que o Supabase Advisor levanta contra a versão da spec).

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER wines_set_updated_at
  BEFORE UPDATE ON public.wines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cria perfil + settings no signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), 'Enófilo')
  );

  INSERT INTO public.user_settings (id, email)
  VALUES (NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mantém posts.likes sincronizado com post_likes.
-- SECURITY DEFINER porque quem dá like não é o dono do post e a política
-- de UPDATE em posts é restrita ao próprio autor.
CREATE OR REPLACE FUNCTION public.sync_post_likes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER post_likes_sync
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes();

-- Limite do plano free (secção 13: free até 50 garrafas).
-- Validar isto só no cliente não serve de nada — qualquer pessoa com a anon
-- key contorna a app e insere na mesma.
CREATE OR REPLACE FUNCTION public.enforce_free_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  plano   public.user_plan;
  n_atual INTEGER;
BEGIN
  SELECT plan INTO plano FROM public.profiles WHERE id = NEW.user_id;

  IF plano = 'free' THEN
    SELECT COUNT(*) INTO n_atual FROM public.wines WHERE user_id = NEW.user_id;
    IF n_atual >= 50 THEN
      RAISE EXCEPTION 'LIMITE_PLANO_FREE'
        USING HINT = 'O plano gratuito permite até 50 vinhos. Faz upgrade para Premium.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wines_free_plan_limit
  BEFORE INSERT ON public.wines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_limit();
