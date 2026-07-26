/**
 * Verificação ponta a ponta contra o projecto Supabase real.
 *
 *   npx tsx scripts/verificar-supabase.ts
 *
 * Cria dois utilizadores, exercita o fluxo completo da app e confirma que o
 * RLS se comporta com sessões verdadeiras — não com `SET role` simulado como
 * nos testes locais. Cada execução usa emails únicos, por isso é repetível.
 *
 * Requer `.env` com as credenciais do projecto.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const linha of readFileSync(join(raiz, '.env'), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m?.[1] && m[2]) process.env[m[1]] = m[2].trim();
}

const URL_SB = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_SB || !KEY) throw new Error('Faltam credenciais no .env');

const marca = Date.now();
let falhas = 0;

function ok(nome: string) {
  console.log(`  OK  ${nome}`);
}
function falhou(nome: string, detalhe: string) {
  falhas += 1;
  console.log(`  ✗   ${nome}\n      ${detalhe}`);
}
function verifica(cond: boolean, nome: string, detalhe = '') {
  cond ? ok(nome) : falhou(nome, detalhe);
}

function cliente(): SupabaseClient {
  return createClient(URL_SB!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function criarUtilizador(etiqueta: string) {
  const sb = cliente();
  const email = `teste-${etiqueta}-${marca}@vinhavibe-teste.pt`;
  const { data, error } = await sb.auth.signUp({
    email,
    password: 'palavra-passe-de-teste-123',
    options: { data: { name: `Prova ${etiqueta}` } },
  });
  if (error) throw new Error(`signUp de ${etiqueta} falhou: ${error.message}`);
  return { sb, email, id: data.user?.id, temSessao: data.session !== null };
}

async function main() {
  console.log(`\n▶ Projecto: ${URL_SB}\n`);

  console.log('Registo e trigger de perfil');
  const ana = await criarUtilizador('ana');
  const bruno = await criarUtilizador('bruno');
  verifica(!!ana.id && !!bruno.id, 'signUp cria os dois utilizadores');
  verifica(ana.temSessao, 'sessão devolvida no registo (confirmação de email desligada)');

  if (!ana.temSessao) {
    console.log('\n  Confirmação de email está activa — o resto do teste precisa de sessão.');
    process.exit(1);
  }

  const { data: perfil } = await ana.sb
    .from('profiles')
    .select('name, plan, location')
    .eq('id', ana.id!)
    .single();
  verifica(perfil?.name === 'Prova ana', 'handle_new_user leu o nome do metadata', JSON.stringify(perfil));
  verifica(perfil?.plan === 'free', 'plano inicial é free');
  verifica(perfil?.location === 'Lisboa', 'localização por omissão é Lisboa');

  console.log('\nCave privada');
  const { error: eIns } = await ana.sb.from('wines').insert({
    user_id: ana.id!, name: 'Redoma Tinto', producer: 'Niepoort',
    region: 'Douro', wine_type: 'tinto', quantity: 6, purchase_price: 30,
  });
  verifica(!eIns, 'Ana insere um vinho na cave dela', eIns?.message ?? '');

  const { data: caveAna } = await ana.sb.from('wines').select('name');
  const { data: caveBruno } = await bruno.sb.from('wines').select('name');
  verifica(caveAna?.length === 1, 'Ana vê o vinho dela');
  verifica(caveBruno?.length === 0, 'Bruno NÃO vê a cave da Ana', `viu ${caveBruno?.length}`);

  const { error: eRoubo } = await bruno.sb.from('wines').insert({
    user_id: ana.id!, name: 'Intruso', producer: 'X', region: 'Y', wine_type: 'tinto',
  });
  verifica(!!eRoubo, 'Bruno não consegue inserir na cave da Ana', 'inserção foi aceite');

  console.log('\nPerfis e privacidade');
  const { data: perfilDoBruno } = await ana.sb
    .from('profiles').select('name').eq('id', bruno.id!).single();
  verifica(perfilDoBruno?.name === 'Prova bruno', 'Ana lê o perfil do Bruno (feed social)');

  const { data: settingsAlheias } = await ana.sb
    .from('user_settings').select('email').eq('id', bruno.id!);
  verifica(settingsAlheias?.length === 0, 'Ana NÃO lê o email do Bruno');

  console.log('\nEscalada de privilégios');
  const { error: ePlano } = await ana.sb
    .from('profiles').update({ plan: 'premium' }).eq('id', ana.id!);
  const { data: depois } = await ana.sb
    .from('profiles').select('plan').eq('id', ana.id!).single();
  verifica(depois?.plan === 'free', 'Ana não se promove a premium', `plano ficou ${depois?.plan}; erro: ${ePlano?.message}`);

  console.log('\nLimite do plano gratuito');
  const { error: eLimite } = await ana.sb.from('wines').insert({
    user_id: ana.id!, name: 'Excesso', producer: 'X', region: 'Douro',
    wine_type: 'tinto', quantity: 45,
  });
  verifica(
    !!eLimite && eLimite.message.includes('LIMITE_PLANO_FREE'),
    'a 51.ª garrafa é recusada pelo servidor',
    eLimite?.message ?? 'inserção aceite',
  );

  const { error: eUpdate } = await ana.sb
    .from('wines').update({ quantity: 500 }).eq('user_id', ana.id!);
  verifica(
    !!eUpdate && eUpdate.message.includes('LIMITE_PLANO_FREE'),
    'UPDATE da quantidade não contorna o limite',
    eUpdate?.message ?? 'update aceite',
  );

  console.log('\nLogin');
  const sbNovo = cliente();
  const { error: eLogin } = await sbNovo.auth.signInWithPassword({
    email: ana.email, password: 'palavra-passe-de-teste-123',
  });
  verifica(!eLogin, 'login com as credenciais criadas', eLogin?.message ?? '');

  const { error: eMa } = await sbNovo.auth.signInWithPassword({
    email: ana.email, password: 'errada',
  });
  verifica(!!eMa, 'password errada é recusada');

  console.log(falhas === 0 ? '\n✅ tudo passou\n' : `\n❌ ${falhas} verificação(ões) falharam\n`);
  process.exit(falhas === 0 ? 0 : 1);
}

void main();
