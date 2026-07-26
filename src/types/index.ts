/**
 * Tipos partilhados da VinhaVibe.
 *
 * A base é a secção 7 da especificação. Os blocos marcados com "GAP" cobrem
 * tipos que a spec usa em assinaturas de funções (secções 8, 9 e 10) mas nunca
 * chega a definir.
 */

export type Plan = 'free' | 'premium';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  plan: Plan;
  location: string;
}

/**
 * GAP — a CaveScreen (10.4) filtra por Tintos / Brancos / Rosés / Espumantes,
 * mas a tabela `wines` da secção 5 não tem coluna de cor. É preciso adicionar
 * `wine_type` ao schema no passo 3, senão o filtro não é implementável.
 */
export type WineType = 'tinto' | 'branco' | 'rose' | 'espumante' | 'fortificado';

export type WineSource = 'manual' | 'scan' | 'bulk_invoice' | 'shelf_scan';

export interface Wine {
  id: string;
  user_id: string;
  name: string;
  producer: string;
  region: string;
  subregion?: string;
  country: string;
  wine_type: WineType;
  grape_varieties: string[];
  vintage?: number;
  quantity: number;
  purchase_price?: number;
  purchase_date?: string;
  current_market_value?: number;
  label_image_url?: string;
  tasting_notes?: string;
  food_pairings: string[];
  maturation_window_start?: number;
  maturation_window_end?: number;
  is_natural: boolean;
  is_low_intervention: boolean;
  is_organic: boolean;
  is_biodynamic: boolean;
  pureza_score?: number;
  rarity_score?: number;
  source: WineSource;
  created_at: string;
  updated_at: string;
}

/** Payload de escrita: o servidor gera id e timestamps. */
export type WineInput = Omit<Wine, 'id' | 'created_at' | 'updated_at'>;

export type PriceTrend = 'up' | 'down' | 'stable';

export interface WineMarketData {
  wine_id: string;
  current_price_min: number;
  current_price_max: number;
  average_price: number;
  auction_price?: number;
  price_trend: PriceTrend;
  trend_pct: number;
  last_updated: string;
}

export interface ScanResult {
  name: string;
  producer: string;
  region: string;
  country: string;
  wine_type: WineType;
  vintage?: number;
  grape_varieties: string[];
  tasting_notes?: string;
  food_pairings: string[];
  maturation_window_start?: number;
  maturation_window_end?: number;
  is_natural: boolean;
  is_low_intervention: boolean;
  is_organic: boolean;
  is_biodynamic: boolean;
  pureza_score: number;
  rarity_score: number;
  /** 0–1. Abaixo de 0.6 a UI deve pedir confirmação manual ao utilizador. */
  confidence: number;
}

export interface BulkInvoiceResult {
  store_name: string;
  invoice_date: string;
  total_amount: number;
  wines: Partial<Wine>[];
}

export interface WeatherData {
  temp_c: number;
  condition: string;
  icon: string;
  is_hot: boolean;
  is_cold: boolean;
  is_rainy: boolean;
}

export type VenueType = 'wine_bar' | 'restaurant' | 'garrafeira' | 'mercado';

export interface WineVenue {
  id: string;
  name: string;
  type: VenueType;
  address: string;
  neighborhood: string;
  rating: number;
  price_range: 1 | 2 | 3 | 4;
  phone?: string;
  reservations_url?: string;
  opening_hours?: string;
  match_day_partner: boolean;
  specialty?: string;
}

export type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';

export interface Fixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  status: FixtureStatus;
  score?: { home: number; away: number };
  competition: string;
  matchday?: number;
  minute?: number;
}

export interface WinePost {
  id: string;
  user: { id: string; name: string; avatar?: string; location: string };
  wine_name: string;
  producer?: string;
  region?: string;
  vintage?: number;
  rating: number;
  note: string;
  occasion?: string;
  mood?: string;
  is_pureza: boolean;
  likes: number;
  liked: boolean;
  comments: number;
  timestamp: string;
}

export interface CellarStats {
  total_bottles: number;
  total_invested: number;
  current_market_value: number;
  roi_pct: number;
  wines_at_peak: number;
  natural_pct: number;
}

/* ------------------------------------------------------------------ *
 * GAP — tipos usados pela spec mas não definidos na secção 7
 * ------------------------------------------------------------------ */

/** Usado por `sommelierMessages` no store (8) e `sommelierChat` (9.1). */
export interface Message {
  id: string;
  role: 'user' | 'sommelier';
  content: string;
  timestamp: string;
}

/** Devolvido por `getSeasonalProducts()` (9.5). */
export interface MarketProduct {
  id: string;
  name: string;
  emoji: string;
  market: string;
  stall?: string;
  season: ('primavera' | 'verao' | 'outono' | 'inverno')[];
  pairs_with: string[];
}

/** Valor de `TEAM_WINE_PAIRINGS` (9.4). */
export interface WinePairing {
  wine_name: string;
  producer: string;
  region: string;
  reason: string;
}

/** Retorno de `calculateROI()` (9.2). */
export interface ROIResult {
  roi_pct: number;
  profit_eur: number;
  annualized_pct: number;
  /** Diferença face à inflação PT de referência (2,8%/ano). */
  vs_inflation_pct: number;
}

/** Cards do separador Desafios (10.10). */
export interface Challenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  expires_at: string;
  premium_only: boolean;
}

/**
 * Filtros da CaveScreen (10.4). A spec tipa `getFilteredWines(filter: string)`,
 * mas uma união evita filtros inválidos silenciosos.
 */
export type WineFilter =
  | 'todos'
  | 'tintos'
  | 'brancos'
  | 'roses'
  | 'espumantes'
  | 'naturais'
  | 'beber_agora'
  | 'investimento';

/** Resultado de qualquer chamada de rede, para tratamento de erro uniforme. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
