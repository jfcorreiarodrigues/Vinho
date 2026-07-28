/**
 * Tipos da base de dados, espelhando `supabase/migrations`.
 *
 * Em produção isto deve passar a ser gerado:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 * Mantido à mão por agora para o projecto compilar sem projecto provisionado.
 */

export type WineTypeEnum =
  | 'tinto'
  | 'branco'
  | 'rose'
  | 'espumante'
  | 'fortificado';

export type WineSourceEnum = 'manual' | 'scan' | 'bulk_invoice' | 'shelf_scan';

export type UserPlanEnum = 'free' | 'premium';

export type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  location: string;
  plan: UserPlanEnum;
  created_at: string;
};

export type UserSettingsRow = {
  id: string;
  email: string | null;
  preferences: Record<string, unknown>;
  expo_push_token: string | null;
  stripe_customer_id: string | null;
  updated_at: string;
};

export type WineRow = {
  id: string;
  user_id: string;
  name: string;
  producer: string;
  region: string;
  subregion: string | null;
  country: string;
  wine_type: WineTypeEnum;
  grape_varieties: string[];
  vintage: number | null;
  quantity: number;
  purchase_price: number | null;
  purchase_date: string | null;
  current_market_value: number | null;
  label_image_url: string | null;
  tasting_notes: string | null;
  food_pairings: string[];
  maturation_window_start: number | null;
  maturation_window_end: number | null;
  is_natural: boolean;
  is_low_intervention: boolean;
  is_organic: boolean;
  is_biodynamic: boolean;
  pureza_score: number | null;
  rarity_score: number | null;
  source: WineSourceEnum;
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: string;
  user_id: string;
  wine_id: string | null;
  wine_name: string;
  producer: string | null;
  region: string | null;
  vintage: number | null;
  rating: number;
  note: string | null;
  occasion: string | null;
  mood: string | null;
  is_pureza: boolean;
  image_url: string | null;
  likes: number;
  created_at: string;
};

export type PostLikeRow = {
  post_id: string;
  user_id: string;
  created_at: string;
};

export type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

/** Colunas geridas pela base de dados, nunca enviadas pelo cliente. */
type Generated = 'id' | 'created_at' | 'updated_at';

/**
 * O `Update` de cada tabela reflecte os GRANT de coluna definidos em
 * `20260726000200_rls_policies.sql`. Colunas que o cliente não pode escrever
 * (`plan`, `likes`, `stripe_customer_id`) ficam de fora — assim o TypeScript
 * apanha a tentativa antes de o Postgres a rejeitar em runtime.
 *
 * Tem de ser `type` e não `interface`: o supabase-js exige que o schema seja
 * atribuível a `Record<string, GenericTable>`, e em TypeScript só os type
 * aliases recebem index signature implícita. Com `interface` todas as queries
 * colapsam para `never`.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'plan'> & {
          created_at?: string;
          plan?: UserPlanEnum;
        };
        Update: Partial<Pick<ProfileRow, 'name' | 'avatar_url' | 'location'>>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Pick<UserSettingsRow, 'id'> & Partial<UserSettingsRow>;
        Update: Partial<
          Pick<UserSettingsRow, 'email' | 'preferences' | 'expo_push_token'>
        >;
        Relationships: [];
      };
      wines: {
        Row: WineRow;
        Insert: Omit<WineRow, Generated> & { id?: string };
        Update: Partial<Omit<WineRow, 'id' | 'user_id' | Generated>>;
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: Omit<PostRow, Generated | 'likes'> & { id?: string };
        Update: Partial<
          Omit<PostRow, 'id' | 'user_id' | 'likes' | 'created_at'>
        >;
        Relationships: [];
      };
      post_likes: {
        Row: PostLikeRow;
        Insert: Omit<PostLikeRow, 'created_at'>;
        Update: Partial<Omit<PostLikeRow, 'created_at'>>;
        Relationships: [];
      };
      follows: {
        Row: FollowRow;
        Insert: Omit<FollowRow, 'created_at'>;
        Update: Partial<Omit<FollowRow, 'created_at'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      /**
       * Referência de preço agregada da comunidade. Devolve zero linhas
       * quando há menos de três utilizadores distintos com o mesmo vinho —
       * ver `20260726000600_preco_comunidade.sql`.
       */
      preco_comunidade: {
        Args: {
          p_producer: string;
          p_name: string;
          p_vintage?: number | null;
        };
        Returns: {
          mediana: number;
          minimo: number;
          maximo: number;
          amostras: number;
        }[];
      };
    };
    Enums: {
      wine_type: WineTypeEnum;
      wine_source: WineSourceEnum;
      user_plan: UserPlanEnum;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
