-- Corrige o limite do plano gratuito.
--
-- A versão anterior contava LINHAS da tabela `wines`. A secção 13 da
-- especificação fala em garrafas ("Garrafas ilimitadas (free: até 50)"), o que
-- é diferente: quem tivesse 1 vinho com 60 garrafas passava, e quem tivesse
-- 51 vinhos com 1 garrafa cada era bloqueado.
--
-- Havia também uma fuga: o trigger só corria em INSERT. Bastava inserir um
-- vinho com quantity = 1 e depois fazer UPDATE para 500.

CREATE OR REPLACE FUNCTION public.enforce_free_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  plano     public.user_plan;
  garrafas  INTEGER;
  ja_havia  INTEGER;
BEGIN
  SELECT plan INTO plano FROM public.profiles WHERE id = NEW.user_id;

  IF plano <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO garrafas
  FROM public.wines
  WHERE user_id = NEW.user_id;

  -- Num UPDATE, a linha actual já está contada acima; descontamos a
  -- quantidade antiga para comparar com a nova.
  ja_havia := CASE WHEN TG_OP = 'UPDATE' THEN OLD.quantity ELSE 0 END;

  IF garrafas - ja_havia + NEW.quantity > 50 THEN
    RAISE EXCEPTION 'LIMITE_PLANO_FREE'
      USING HINT = 'O plano gratuito permite até 50 garrafas.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wines_free_plan_limit ON public.wines;

CREATE TRIGGER wines_free_plan_limit
  BEFORE INSERT OR UPDATE OF quantity ON public.wines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_limit();
