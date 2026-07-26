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

## Desvios conscientes à especificação

| Spec | Implementado | Porquê |
|---|---|---|
| Expo SDK 51 / RN 0.74 | **SDK 57 / RN 0.86** | O SDK 51 já nem consta das dist-tags do npm e não cumpre o API level mínimo do Google Play — seria rejeitado na submissão. |
| React Navigation v6 | **v7** | O v6 não suporta React 19 / RN 0.86. |
| Zustand 4.5 | **5.x** | O v4 tem problemas conhecidos com React 19. |
| Chaves em `EXPO_PUBLIC_*` | **Supabase Edge Functions** (a partir do passo 3) | `EXPO_PUBLIC_*` é embutido no bundle e é trivialmente extraível. Gemini, Wine-Searcher e Stripe passam a ser chamados server-side. |
| `wines` sem coluna de cor | **`wine_type` adicionado** | Os filtros da CaveScreen (Tintos/Brancos/Rosés/Espumantes) não eram implementáveis sem ela. |

## Estado da implementação

Seguindo a ordem da secção 16 da especificação:

- [x] **1. Setup base** — `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `eas.json`, `.env.example`, `.gitignore`
- [x] **2. Theme + Types** — `src/theme/index.ts`, `src/types/index.ts`
- [ ] 3. Supabase

- [ ] 4. Store
- [ ] 5. Auth flow
- [ ] 6. Scan core
- [ ] 7. Cave
- [ ] 8. Sommelier
- [ ] 9. Futebol
- [ ] 10. Social
- [ ] 11. Bulk entry
- [ ] 12. Investment
- [ ] 13. Profile + Stripe
- [ ] 14. Notificações
- [ ] 15. Polimento
