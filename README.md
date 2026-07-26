# VinhaVibe

App mobile premium (iOS + Android) de gestão de cave de vinho, focada no mercado
português — *"Vivino para quem leva vinho a sério em Portugal"*.

## Stack

- **Framework:** Expo SDK 51 + React Native 0.74
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

## Estado da implementação

Seguindo a ordem da secção 16 da especificação:

- [x] **1. Setup base** — `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `eas.json`, `.env.example`, `.gitignore`
- [ ] 2. Theme + Types
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
