/**
 * Locais de vinho em Lisboa.
 *
 * Dados curados à mão, como a secção 9.5 da especificação recomenda: a API
 * pública da Lisboa Aberta é instável e não cobre garrafeiras nem wine bars.
 *
 * São estabelecimentos reais e conhecidos da cidade, mas os contactos e
 * horários mudam — a app mostra-os como ponto de partida, não como
 * informação oficial. Rever periodicamente.
 */

import type { MarketProduct, WineVenue } from '@/types';

export const LISBON_WINE_VENUES: WineVenue[] = [
  {
    id: 'garrafeira-nacional',
    name: 'Garrafeira Nacional',
    type: 'garrafeira',
    address: 'Rua de Santa Justa 18',
    neighborhood: 'Baixa',
    rating: 4.6,
    price_range: 3,
    match_day_partner: true,
    specialty: 'Vinhos antigos e Porto vintage',
  },
  {
    id: 'by-the-wine',
    name: 'By The Wine',
    type: 'wine_bar',
    address: 'Rua das Flores 41-43',
    neighborhood: 'Chiado',
    rating: 4.5,
    price_range: 3,
    match_day_partner: true,
    specialty: 'Adega do José Maria da Fonseca, tecto de garrafas',
  },
  {
    id: 'park-bar',
    name: 'Park',
    type: 'wine_bar',
    address: 'Calçada do Combro 58 (último piso)',
    neighborhood: 'Bairro Alto',
    rating: 4.4,
    price_range: 2,
    match_day_partner: false,
    specialty: 'Rooftop com vista sobre o Tejo',
  },
  {
    id: 'wine-souls',
    name: 'Wine & Souls',
    type: 'wine_bar',
    address: 'Travessa do Monte do Carmo 1',
    neighborhood: 'Príncipe Real',
    rating: 4.7,
    price_range: 3,
    match_day_partner: false,
    specialty: 'Naturais e pequenos produtores',
  },
  {
    id: 'bairro-avillez',
    name: 'Bairro do Avillez',
    type: 'restaurant',
    address: 'Rua Nova da Trindade 18',
    neighborhood: 'Chiado',
    rating: 4.5,
    price_range: 4,
    match_day_partner: true,
    specialty: 'Taberna e Páteo, carta portuguesa extensa',
  },
  {
    id: 'taberna-flores',
    name: 'Taberna da Rua das Flores',
    type: 'restaurant',
    address: 'Rua das Flores 103',
    neighborhood: 'Cais do Sodré',
    rating: 4.6,
    price_range: 3,
    match_day_partner: false,
    specialty: 'Petiscos de mercado, sem reservas',
  },
  {
    id: 'mercado-ribeira',
    name: 'Mercado da Ribeira',
    type: 'mercado',
    address: 'Avenida 24 de Julho 49',
    neighborhood: 'Cais do Sodré',
    rating: 4.3,
    price_range: 2,
    match_day_partner: true,
    specialty: 'Time Out Market, bancas de produtores',
  },
  {
    id: 'mercado-campo-ourique',
    name: 'Mercado de Campo de Ourique',
    type: 'mercado',
    address: 'Rua Coelho da Rocha 104',
    neighborhood: 'Campo de Ourique',
    rating: 4.4,
    price_range: 2,
    match_day_partner: false,
    specialty: 'Mercado de bairro com bancas de vinho',
  },
];

/** Produtos de época dos mercados municipais, para o Sommelier (passo 8). */
const PRODUTOS: MarketProduct[] = [
  { id: 'sardinha', name: 'Sardinha', emoji: '🐟', market: 'Ribeira', season: ['verao'], pairs_with: ['Vinho Verde', 'Alvarinho'] },
  { id: 'castanha', name: 'Castanha', emoji: '🌰', market: 'Campo de Ourique', season: ['outono'], pairs_with: ['Douro tinto', 'Porto Tawny'] },
  { id: 'bacalhau', name: 'Bacalhau', emoji: '🐠', market: 'Arroios', season: ['inverno', 'outono'], pairs_with: ['Bairrada branco', 'Douro branco'] },
  { id: 'borrego', name: 'Borrego', emoji: '🐑', market: 'Alvalade', season: ['primavera'], pairs_with: ['Alentejo tinto', 'Douro reserva'] },
  { id: 'cogumelos', name: 'Cogumelos silvestres', emoji: '🍄', market: 'Ribeira', season: ['outono'], pairs_with: ['Dão tinto', 'Baga'] },
  { id: 'morango', name: 'Morango', emoji: '🍓', market: 'Campo de Ourique', season: ['primavera', 'verao'], pairs_with: ['Espumante', 'Moscatel'] },
];

export function getSeasonalProducts(agora: Date = new Date()): MarketProduct[] {
  const mes = agora.getMonth();
  const estacao =
    mes <= 1 || mes === 11 ? 'inverno' : mes <= 4 ? 'primavera' : mes <= 8 ? 'verao' : 'outono';
  return PRODUTOS.filter((p) => p.season.includes(estacao));
}

export function venuesParaMatchDay(): WineVenue[] {
  return LISBON_WINE_VENUES.filter((v) => v.match_day_partner);
}
