import { create } from 'zustand';

import * as db from '@/lib/supabase';
import {
  calcularStats,
  estaNoPico,
  filtrarVinhos,
  memoizarPorReferencia,
} from '@/store/selectors';
import type {
  CellarStats,
  Message,
  User,
  WeatherData,
  Wine,
  WineFilter,
  WineInput,
  WineMarketData,
} from '@/types';

interface AppStore {
  // Estado
  user: User | null;
  wines: Wine[];
  marketData: Record<string, WineMarketData>;
  weather: WeatherData | null;
  sommelierMessages: Message[];
  isLoading: boolean;
  /** Última mensagem de erro, em PT-PT, para os ecrãs mostrarem. */
  error: string | null;

  // Auth
  setUser: (user: User | null) => void;
  carregarSessao: () => Promise<void>;
  terminarSessao: () => Promise<void>;

  // Vinhos
  fetchWines: () => Promise<void>;
  addWine: (wine: WineInput) => Promise<boolean>;
  addWinesBulk: (wines: WineInput[]) => Promise<boolean>;
  updateWine: (id: string, updates: db.WineUpdateInput) => Promise<boolean>;
  deleteWine: (id: string) => Promise<boolean>;

  // Mercado e clima
  fetchMarketPrice: (wine: Wine) => Promise<void>;
  fetchWeather: () => Promise<void>;

  // Sommelier
  addSommelierMessage: (msg: Message) => void;
  limparSommelier: () => void;

  // Derivado
  getCellarStats: () => CellarStats;
  getFilteredWines: (filter: WineFilter) => Wine[];
  getWinesAtPeak: () => Wine[];

  limparErro: () => void;
}

// Memos ao nível do módulo: o store é um singleton, e sem isto qualquer
// componente que faça `useStore(s => s.getCellarStats())` recebe um objecto
// novo a cada notificação e entra em ciclo de render.
const statsMemo = memoizarPorReferencia(
  (wines: Wine[], marketData: Record<string, WineMarketData>) => {
    // Sobrepor a cotação em cache antes de calcular, para os stats
    // reflectirem o mercado e não só o preço de compra.
    const comMercado = wines.map((w) => {
      const cotacao = marketData[w.id];
      return cotacao ? { ...w, current_market_value: cotacao.average_price } : w;
    });
    return calcularStats(comMercado);
  },
);

const filtroMemo = memoizarPorReferencia(
  (wines: Wine[], filtro: WineFilter) => filtrarVinhos(wines, filtro),
  (_wines, filtro) => filtro,
);

const picoMemo = memoizarPorReferencia((wines: Wine[]) =>
  wines.filter((w) => estaNoPico(w)),
);

export const useStore = create<AppStore>((set, get) => ({
  user: null,
  wines: [],
  marketData: {},
  weather: null,
  sommelierMessages: [],
  isLoading: false,
  error: null,

  /* ----------------------------- Auth ----------------------------- */

  setUser: (user) => set({ user }),

  carregarSessao: async () => {
    set({ isLoading: true, error: null });
    const r = await db.getCurrentUser();
    if (r.ok) {
      set({ user: r.data, isLoading: false });
      if (r.data) await get().fetchWines();
    } else {
      set({ error: r.error, isLoading: false });
    }
  },

  terminarSessao: async () => {
    const r = await db.signOut();
    if (!r.ok) {
      set({ error: r.error });
      return;
    }
    // Limpar tudo: os dados da cave são de quem estava autenticado.
    set({
      user: null,
      wines: [],
      marketData: {},
      sommelierMessages: [],
      error: null,
    });
  },

  /* ---------------------------- Vinhos ---------------------------- */

  fetchWines: async () => {
    set({ isLoading: true, error: null });
    const r = await db.fetchWines();
    set(r.ok ? { wines: r.data, isLoading: false } : { error: r.error, isLoading: false });
  },

  addWine: async (wine) => {
    set({ error: null });
    const r = await db.addWine(wine);
    if (!r.ok) {
      set({ error: r.error });
      return false;
    }
    set((s) => ({ wines: [r.data, ...s.wines] }));
    return true;
  },

  addWinesBulk: async (wines) => {
    set({ isLoading: true, error: null });
    const r = await db.addWinesBulk(wines);
    if (!r.ok) {
      set({ error: r.error, isLoading: false });
      return false;
    }
    set((s) => ({ wines: [...r.data, ...s.wines], isLoading: false }));
    return true;
  },

  updateWine: async (id, updates) => {
    set({ error: null });
    const r = await db.updateWine(id, updates);
    if (!r.ok) {
      set({ error: r.error });
      return false;
    }
    set((s) => ({ wines: s.wines.map((w) => (w.id === id ? r.data : w)) }));
    return true;
  },

  deleteWine: async (id) => {
    const removido = get().wines.find((w) => w.id === id);
    // Optimista: a lista responde de imediato e reverte se o servidor recusar.
    set((s) => ({ wines: s.wines.filter((w) => w.id !== id), error: null }));

    const r = await db.deleteWine(id);
    if (!r.ok) {
      // Repor só este vinho sobre o estado actual, para não desfazer
      // alterações que tenham acontecido entretanto.
      set((s) => ({
        wines: removido && !s.wines.some((w) => w.id === id)
          ? [removido, ...s.wines]
          : s.wines,
        error: r.error,
      }));
      return false;
    }
    return true;
  },

  /* ------------------------ Mercado e clima ----------------------- */

  fetchMarketPrice: async (wine) => {
    // Já em cache nesta sessão: a spec (secção 15) pede para não repetir fetch.
    if (get().marketData[wine.id]) return;

    const r = await db.invokeEdgeFunction<WineMarketData>('wine-market-price', {
      wine_id: wine.id,
      name: wine.name,
      producer: wine.producer,
      vintage: wine.vintage ?? null,
    });

    // Falta de cotação não é erro de ecrã — a UI mostra apenas o preço de compra.
    if (r.ok) {
      set((s) => ({ marketData: { ...s.marketData, [wine.id]: r.data } }));
    }
  },

  fetchWeather: async () => {
    if (get().weather) return;
    const r = await db.invokeEdgeFunction<WeatherData>('weather', {
      cidade: 'Lisboa',
    });
    if (r.ok) set({ weather: r.data });
  },

  /* --------------------------- Sommelier -------------------------- */

  addSommelierMessage: (msg) =>
    set((s) => ({ sommelierMessages: [...s.sommelierMessages, msg] })),

  limparSommelier: () => set({ sommelierMessages: [] }),

  /* --------------------------- Derivado --------------------------- */

  getCellarStats: () => {
    const { wines, marketData } = get();
    return statsMemo(wines, marketData);
  },

  getFilteredWines: (filter) => filtroMemo(get().wines, filter),

  getWinesAtPeak: () => picoMemo(get().wines),

  limparErro: () => set({ error: null }),
}));
