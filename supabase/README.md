# Supabase — schema e migrações

## Projecto activo

| | |
|---|---|
| Ref | `bqgibwlzrsexwckncvsv` |
| Região | `eu-west-3` (Paris, a mais próxima de Portugal) |
| Postgres | 17.6 |
| URL | `https://bqgibwlzrsexwckncvsv.supabase.co` |

As credenciais estão no `.env` (não commitado). A anon key é pública por
desenho — quem protege os dados é o RLS, e é por isso que os testes abaixo
importam.

### Verificar contra o projecto real

```bash
npx tsx scripts/verificar-supabase.ts
```

Cria dois utilizadores com sessões verdadeiras e exercita registo, login,
isolamento de caves, privacidade de emails, escalada de privilégios e limite
do plano gratuito.

## Aplicar as migrações

**Opção A — Supabase CLI (recomendado)**

```bash
npx supabase link --project-ref <o-teu-project-ref>
npx supabase db push
```

**Opção B — painel web**

SQL Editor → colar o conteúdo de cada ficheiro de `migrations/` **pela ordem
do nome** → Run.

## Ordem dos ficheiros

| Ficheiro | Conteúdo |
|---|---|
| `20260726000100_initial_schema.sql` | Tipos, tabelas, índices, triggers |
| `20260726000200_rls_policies.sql` | Row Level Security |
| `20260726000300_storage.sql` | Bucket `wine-labels` e políticas |
| `20260726000400_limite_por_garrafas.sql` | Limite do plano free por garrafas |
| `20260726000500_advisor_fixes.sql` | Correcções do Supabase Advisor |

## Secrets das Edge Functions

As chaves de API não vão para o cliente (ver `.env.example`):

```bash
npx supabase secrets set GEMINI_API_KEY=AIza...
npx supabase secrets set WINE_SEARCHER_API_KEY=...
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

## Divergências face à secção 5 da especificação

Estas mudanças são deliberadas. A versão da spec tinha falhas que só se
manifestariam em produção.

### 1. `profiles` dividida em `profiles` + `user_settings`

A spec tinha:

```sql
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
```

`FOR ALL` inclui `SELECT`, portanto o utilizador A nunca conseguiria ler o
nome ou o avatar do utilizador B — **o feed social renderizava posts sem
autor**. Abrir o `SELECT` a toda a gente também não servia: a tabela guardava
`email`, e isso exporia os emails de todos os utilizadores.

A separação resolve os dois problemas: `profiles` só tem dados que podem ser
públicos; `user_settings` tem email, preferências e tokens, com acesso
restrito ao próprio. O email da sessão vem de `auth.users` via
`supabase.auth.getUser()`.

### 2. RLS activado em `post_likes` e `follows`

A spec não activava RLS nestas duas tabelas. Sem RLS, uma tabela exposta pelo
PostgREST aceita leitura e escrita de qualquer pessoa com a anon key — e a
anon key está no bundle da app. Qualquer pessoa podia dar likes e criar
follows em nome de terceiros.

### 3. Políticas de `UPDATE`/`DELETE` em `posts`

A spec só definia `SELECT` e `INSERT`. Com RLS activo, a ausência de política
é negação: ninguém conseguia editar ou apagar os próprios posts, apesar de a
UI ter o menu `···` que promete isso.

### 4. `posts.likes` mantido por trigger

Era uma coluna solta que nunca era actualizada. Passa a ser sincronizada a
partir de `post_likes` e o cliente perde a permissão de a escrever
(`REVOKE UPDATE (likes)`), senão bastava um `UPDATE` para inflacionar o
contador.

### 5. `search_path` fixado nas funções `SECURITY DEFINER`

`handle_new_user()` na spec não definia `search_path`, o que é o aviso
"Function Search Path Mutable" do Supabase Advisor e permite search path
injection.

### 6. `wine_type` adicionado a `wines`

Os filtros da CaveScreen (Tintos / Brancos / Rosés / Espumantes) não eram
implementáveis: não havia coluna de cor.

### 7. Limite do plano free imposto na base de dados

A secção 13 define 50 garrafas no plano gratuito. Validar isso só no cliente
não tem efeito — quem tiver a anon key insere na mesma. Passa a ser um
trigger `BEFORE INSERT`.

### 8. `plan` e `stripe_customer_id` não são escritos pelo cliente

`REVOKE UPDATE (plan)` impede que um utilizador se promova a premium com um
único `UPDATE`. Só o webhook do Stripe (service role) altera o plano.

### 9. Storage por pasta

A spec permitia a qualquer autenticado escrever em qualquer caminho do
bucket, o que deixava um utilizador sobrepor as etiquetas de outro. Agora
cada um só escreve em `wine-labels/<user_id>/`. Foram também acrescentadas
políticas de `UPDATE` e `DELETE`, que faltavam.

## Verificar depois de aplicar

```sql
-- Nenhuma tabela pública deve aparecer com rls_enabled = false
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables WHERE schemaname = 'public';
```

No painel: **Advisors → Security**. Está sem avisos — mas só depois das
correcções em `20260726000500_advisor_fixes.sql`, que o Advisor apanhou e os
testes locais não conseguiam apanhar:

- a política de leitura no bucket público permitia **listar** todos os
  ficheiros, e como as pastas são os `user_id`, isso enumerava os
  utilizadores todos;
- as funções de trigger, estando no schema `public`, ficavam expostas como
  endpoints RPC.

Correr o Advisor depois de qualquer alteração ao schema.
