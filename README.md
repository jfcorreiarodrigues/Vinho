# VinhaVibe

App mobile premium (iOS + Android) de gestão de cave de vinho, focada no mercado
português — *"Vivino para quem leva vinho a sério em Portugal"*.

## Stack

- **Framework:** Expo SDK 57 + React Native 0.86
- **Linguagem:** TypeScript strict
- **Base de dados:** Supabase (PostgreSQL + Auth + RLS + Storage + Realtime)
- **Estado global:** Zustand
- **Navegação:** React Navigation v6 (Bottom Tabs + Stack)
- **Pagamentos:** Stripe React Native
- **Build/Deploy:** EAS (Expo Application Services)

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencher .env com as chaves reais (Supabase, Gemini, etc.)

# 3. Arrancar em desenvolvimento
npm start
```

## Verificação

```bash
npm run typecheck                    # tsc em modo strict
npm test                             # lógica pura da app (68 testes)
./supabase/tests/run.sh              # migrações + RLS contra Postgres local (12 testes)
npx expo export --platform android   # confirma que a app faz bundle
```

## Variáveis de ambiente

Ver `.env.example` para a lista completa. O `.env` **nunca** é commitado.

| Variável | Serviço | Obrigatória |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ✅ |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini Vision | ✅ |
| `EXPO_PUBLIC_WINE_SEARCHER_API_KEY` | Wine-Searcher | Opcional |
| `EXPO_PUBLIC_WEATHER_API_KEY` | OpenWeatherMap | Opcional |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` | Stripe | Premium |
| `EXPO_PUBLIC_FOOTBALL_API_KEY` | football-data.org | Opcional |

## Base de dados

O schema vive em `supabase/migrations/`. Ver `supabase/README.md` para o
detalhe das divergências face à secção 5 da spec (todas por motivos de
segurança) e para as instruções de aplicação.

```bash
# Correr as migrações e os testes de RLS contra um Postgres local efémero
./supabase/tests/run.sh
```

Os testes cobrem o item do checklist da secção 17 ("utilizador A não vê a cave
do utilizador B") e mais dez invariantes de segurança.

## Assets

Os ícones e o splash são gerados a partir da paleta do design system:

```bash
python3 scripts/gerar-assets.py
```

São assets de trabalho, suficientes para `eas build`. Substituir por arte
definitiva antes de submeter às lojas.

## Desvios conscientes à especificação

| Spec | Implementado | Porquê |
|---|---|---|
| Expo SDK 51 / RN 0.74 | **SDK 57 / RN 0.86** | O SDK 51 já nem consta das dist-tags do npm e não cumpre o API level mínimo do Google Play — seria rejeitado na submissão. |
| React Navigation v6 | **v7** | O v6 não suporta React 19 / RN 0.86. |
| Zustand 4.5 | **5.x** | O v4 tem problemas conhecidos com React 19. |
| Chaves em `EXPO_PUBLIC_*` | **Supabase Edge Functions** (a partir do passo 3) | `EXPO_PUBLIC_*` é embutido no bundle e é trivialmente extraível. Gemini, Wine-Searcher e Stripe passam a ser chamados server-side. |
| `wines` sem coluna de cor | **`wine_type` adicionado** | Os filtros da CaveScreen (Tintos/Brancos/Rosés/Espumantes) não eram implementáveis sem ela. |
| Limite free ambíguo | **50 garrafas** (`SUM(quantity)`) | A secção 13 diz "garrafas". Contar linhas deixava passar 1 vinho × 60 garrafas e bloqueava 51 vinhos × 1. |
| Preços via Wine-Searcher | **Referência da comunidade** | A API não tem acesso self-serve. A mediana dos preços registados pelos utilizadores é gratuita, real e melhora com escala. Ver `20260726000600_preco_comunidade.sql`. |
| `main: expo/AppEntry.js` | **`index.js` + `registerRootComponent`** | O padrão legado servia 404 em `/index.bundle`: `expo export` funcionava, `npx expo start` não. |

## Estado da implementação

Seguindo a ordem da secção 16 da especificação:

- [x] **1. Setup base** — `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `eas.json`, `.env.example`, `.gitignore`
- [x] **2. Theme + Types** — `src/theme/index.ts`, `src/types/index.ts`
- [x] **3. Supabase** — migrações SQL, RLS, `src/lib/supabase.ts`, testes
- [x] **4. Store** — `src/store/` (Zustand + lógica pura testada)
- [x] **5. Auth flow** — Onboarding, Auth, navegação por separadores
- [ ] 6. Scan core — **bloqueado: falta a chave do Gemini**
- [x] **7. Cave** — `CaveScreen`, `WineDetailScreen`, entrada manual
- [ ] 8. Sommelier — **bloqueado: falta a chave do Gemini**
- [x] **9. Futebol** — `FootballScreen`, maridagens, wine bars de Lisboa
- [x] **10. Social** — `SocialScreen` (feed, descobrir, desafios)
- [ ] 11. Bulk entry — **bloqueado: falta a chave do Gemini**
- [x] **12. Investment** — `InvestmentScreen`, `investimento.ts`, `winePrices.ts`
- [~] **13. Profile** — `ProfileScreen` feito; Stripe pendente de chaves
- [x] **14. Notificações** — `alertas.ts` (puro, testado) + `notifications.ts`
- [~] 15. Polimento — feito ao longo do caminho; falta rever em dispositivo
