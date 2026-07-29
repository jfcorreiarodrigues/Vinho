#!/usr/bin/env bash
#
# Publica as três Edge Functions e configura o segredo do Gemini.
#
# Isto não pôde ser feito a partir do ambiente de desenvolvimento do agente:
# a rede de lá bloqueia `api.supabase.com`. Corre-o na tua máquina.
#
#   ./scripts/publicar-supabase.sh
#
# A chave é lida de forma interactiva (não aparece no terminal nem no
# histórico da shell) ou, se preferires automatizar, de GEMINI_API_KEY:
#
#   GEMINI_API_KEY=AIza... ./scripts/publicar-supabase.sh
#
set -euo pipefail

PROJETO="${SUPABASE_PROJECT_REF:-bqgibwlzrsexwckncvsv}"
FUNCOES=(gemini-scan gemini-sommelier gemini-bulk)

cd "$(dirname "$0")/.."

# `npx supabase` evita obrigar a instalar o CLI globalmente.
supabase() { npx --yes supabase "$@"; }

echo "Projeto: $PROJETO"

if ! supabase projects list >/dev/null 2>&1; then
  echo
  echo "Não estás autenticado no Supabase. Vai abrir o browser:"
  supabase login
fi

for f in "${FUNCOES[@]}"; do
  echo
  echo "→ a publicar $f"
  supabase functions deploy "$f" --project-ref "$PROJETO"
done

# O segredo é o que faz a diferença entre os ecrãs funcionarem e caírem para
# entrada manual. Sem ele as funções respondem 500 com uma mensagem explícita.
chave="${GEMINI_API_KEY:-}"
if [ -z "$chave" ]; then
  echo
  read -rsp "Chave do Gemini (fica escondida, Enter para saltar): " chave
  echo
fi

if [ -n "$chave" ]; then
  echo "→ a configurar GEMINI_API_KEY"
  supabase secrets set "GEMINI_API_KEY=$chave" --project-ref "$PROJETO"
else
  echo
  echo "AVISO: GEMINI_API_KEY não configurada."
  echo "O scan, o sommelier e a entrada em lote vão devolver erro e oferecer"
  echo "a entrada manual. Configura depois com:"
  echo "  npx supabase secrets set GEMINI_API_KEY=AIza... --project-ref $PROJETO"
fi

echo
echo "Feito. Confirma com:"
echo "  npx supabase functions list --project-ref $PROJETO"
