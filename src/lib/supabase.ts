import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database, WineRow } from '@/types/database';
import type { Result, User, Wine, WineInput } from '@/types';

/* ------------------------------------------------------------------ *
 * Cliente
 * ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL e/ou EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copia .env.example para .env e preenche os valores.',
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Não há callback de OAuth por URL em React Native.
    detectSessionInUrl: false,
  },
});

// O refresh automático só deve correr com a app em primeiro plano; caso
// contrário o timer fica a disparar em background e falha sem rede.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});

/* ------------------------------------------------------------------ *
 * Erros
 * ------------------------------------------------------------------ */

/**
 * O Supabase devolve mensagens em inglês. A secção 15 exige PT-PT em tudo o
 * que chega ao utilizador, por isso traduzimos os casos conhecidos e damos
 * uma mensagem genérica ao resto.
 */
export function traduzErro(error: PostgrestError | Error | null): string {
  if (!error) return 'Ocorreu um erro inesperado.';

  const msg = error.message ?? '';

  if (msg.includes('LIMITE_PLANO_FREE')) {
    return 'O plano gratuito permite até 50 garrafas na cave. Faz upgrade para Premium para adicionares mais.';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Email ou palavra-passe incorrectos.';
  }
  if (msg.includes('User already registered')) {
    return 'Já existe uma conta com este email.';
  }
  if (msg.includes('Password should be at least')) {
    return 'A palavra-passe tem de ter pelo menos 6 caracteres.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Confirma o teu email antes de entrares.';
  }
  if (msg.includes('Unable to validate email address')) {
    return 'O endereço de email não é válido.';
  }
  if (msg.includes('duplicate key')) {
    return 'Este registo já existe.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
    return 'Sem ligação à internet. Verifica a rede e tenta outra vez.';
  }

  return 'Não foi possível completar a operação. Tenta novamente.';
}

function falha<T>(error: PostgrestError | Error | null): Result<T> {
  return { ok: false, error: traduzErro(error) };
}

/* ------------------------------------------------------------------ *
 * Autenticação
 * ------------------------------------------------------------------ */

export interface ResultadoRegisto {
  /**
   * Verdadeiro quando o projecto exige confirmação por email: o registo teve
   * sucesso mas não há sessão, por isso nada muda no ecrã. Sem este sinal a
   * app parece encravada depois de carregar em "Criar conta".
   */
  precisaConfirmarEmail: boolean;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<Result<ResultadoRegisto>> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return falha(error);
  return { ok: true, data: { precisaConfirmarEmail: data.session === null } };
}

export async function signIn(
  email: string,
  password: string,
): Promise<Result<null>> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? falha(error) : { ok: true, data: null };
}

export async function signOut(): Promise<Result<null>> {
  const { error } = await supabase.auth.signOut();
  return error ? falha(error) : { ok: true, data: null };
}

/**
 * Junta o perfil público com o email da sessão. O email vive em `auth.users`,
 * não em `profiles` — de propósito, para o feed social poder ler perfis de
 * outros utilizadores sem expor endereços de email.
 */
export async function getCurrentUser(): Promise<Result<User | null>> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) return falha(authError);
  if (!auth.user) return { ok: true, data: null };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, location, plan')
    .eq('id', auth.user.id)
    .single();

  if (error) return falha(error);

  return {
    ok: true,
    data: {
      id: profile.id,
      name: profile.name,
      email: auth.user.email ?? '',
      avatar_url: profile.avatar_url ?? undefined,
      plan: profile.plan,
      location: profile.location,
    },
  };
}

export async function updateProfile(
  updates: { name?: string; location?: string; avatar_url?: string },
): Promise<Result<null>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Sessão expirada. Entra outra vez.' };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.id);

  return error ? falha(error) : { ok: true, data: null };
}

/* ------------------------------------------------------------------ *
 * Vinhos
 * ------------------------------------------------------------------ */

type WineInsertRow = Database['public']['Tables']['wines']['Insert'];
type WineUpdateRow = Database['public']['Tables']['wines']['Update'];

/** Campos opcionais que no domínio são `undefined` e na BD são NULL. */
export type WineUpdateInput = Partial<Omit<WineInput, 'user_id'>>;

/**
 * O domínio usa `undefined` para "sem valor", o Postgres usa NULL. As duas
 * funções abaixo fazem a tradução nos dois sentidos — sem elas o insert
 * escreve `undefined` e o PostgREST descarta o campo em silêncio.
 */
function toInsertRow(wine: WineInput): WineInsertRow {
  return {
    user_id: wine.user_id,
    name: wine.name,
    producer: wine.producer,
    region: wine.region,
    subregion: wine.subregion ?? null,
    country: wine.country,
    wine_type: wine.wine_type,
    grape_varieties: wine.grape_varieties,
    vintage: wine.vintage ?? null,
    quantity: wine.quantity,
    purchase_price: wine.purchase_price ?? null,
    purchase_date: wine.purchase_date ?? null,
    current_market_value: wine.current_market_value ?? null,
    label_image_url: wine.label_image_url ?? null,
    tasting_notes: wine.tasting_notes ?? null,
    food_pairings: wine.food_pairings,
    maturation_window_start: wine.maturation_window_start ?? null,
    maturation_window_end: wine.maturation_window_end ?? null,
    is_natural: wine.is_natural,
    is_low_intervention: wine.is_low_intervention,
    is_organic: wine.is_organic,
    is_biodynamic: wine.is_biodynamic,
    pureza_score: wine.pureza_score ?? null,
    rarity_score: wine.rarity_score ?? null,
    source: wine.source,
  };
}

/** Chave ausente = não mexer; chave presente a `undefined` = limpar para NULL. */
function toUpdateRow(updates: WineUpdateInput): WineUpdateRow {
  const row: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(updates)) {
    row[chave] = valor === undefined ? null : valor;
  }
  return row as WineUpdateRow;
}

/** As colunas da BD já são snake_case, mas os nulos precisam de virar undefined. */
function toWine(row: WineRow): Wine {
  return {
    ...row,
    subregion: row.subregion ?? undefined,
    vintage: row.vintage ?? undefined,
    purchase_price: row.purchase_price ?? undefined,
    purchase_date: row.purchase_date ?? undefined,
    current_market_value: row.current_market_value ?? undefined,
    label_image_url: row.label_image_url ?? undefined,
    tasting_notes: row.tasting_notes ?? undefined,
    maturation_window_start: row.maturation_window_start ?? undefined,
    maturation_window_end: row.maturation_window_end ?? undefined,
    pureza_score: row.pureza_score ?? undefined,
    rarity_score: row.rarity_score ?? undefined,
  };
}

export async function fetchWines(): Promise<Result<Wine[]>> {
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .order('created_at', { ascending: false });

  return error ? falha(error) : { ok: true, data: data.map(toWine) };
}

export async function addWine(wine: WineInput): Promise<Result<Wine>> {
  const { data, error } = await supabase
    .from('wines')
    .insert(toInsertRow(wine))
    .select()
    .single();

  return error ? falha(error) : { ok: true, data: toWine(data) };
}

export async function addWinesBulk(wines: WineInput[]): Promise<Result<Wine[]>> {
  if (wines.length === 0) return { ok: true, data: [] };

  const { data, error } = await supabase
    .from('wines')
    .insert(wines.map(toInsertRow))
    .select();

  return error ? falha(error) : { ok: true, data: data.map(toWine) };
}

export async function updateWine(
  id: string,
  updates: WineUpdateInput,
): Promise<Result<Wine>> {
  const { data, error } = await supabase
    .from('wines')
    .update(toUpdateRow(updates))
    .eq('id', id)
    .select()
    .single();

  return error ? falha(error) : { ok: true, data: toWine(data) };
}

export async function deleteWine(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('wines').delete().eq('id', id);
  return error ? falha(error) : { ok: true, data: null };
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

/**
 * As políticas do bucket exigem que o primeiro segmento do caminho seja o
 * user_id — ver `20260726000300_storage.sql`.
 */
export async function uploadLabelImage(
  localUri: string,
): Promise<Result<string>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Sessão expirada. Entra outra vez.' };

  try {
    const bytes = await fetch(localUri).then((r) => r.arrayBuffer());
    const extensao = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const caminho = `${auth.user.id}/${Date.now()}.${extensao}`;

    const { error } = await supabase.storage
      .from('wine-labels')
      .upload(caminho, bytes, {
        contentType: `image/${extensao === 'jpg' ? 'jpeg' : extensao}`,
        upsert: false,
      });

    if (error) return falha(error);

    const { data } = supabase.storage.from('wine-labels').getPublicUrl(caminho);
    return { ok: true, data: data.publicUrl };
  } catch (e) {
    return falha(e instanceof Error ? e : null);
  }
}

/* ------------------------------------------------------------------ *
 * Edge Functions
 * ------------------------------------------------------------------ */

/**
 * Ponto único de entrada para tudo o que precisa de chaves secretas.
 *
 * A spec (secção 3) punha as chaves do Gemini, Wine-Searcher e Stripe em
 * variáveis `EXPO_PUBLIC_*`. Essas variáveis são embutidas no bundle
 * JavaScript em build time — qualquer pessoa que descarregue o APK/IPA
 * extrai-as. As chaves passam a viver como secrets das Edge Functions e o
 * cliente só invoca a função, autenticado com o seu JWT.
 */
export async function invokeEdgeFunction<
  TResposta,
  TCorpo extends Record<string, unknown> = Record<string, unknown>,
>(nome: string, corpo: TCorpo): Promise<Result<TResposta>> {
  const { data, error } = await supabase.functions.invoke<TResposta>(nome, {
    body: corpo,
  });

  if (error) return falha(error);
  if (data === null) return { ok: false, error: 'Resposta vazia do servidor.' };

  return { ok: true, data };
}
