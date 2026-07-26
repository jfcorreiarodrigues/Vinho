/**
 * Jogos e maridagens por equipa.
 *
 * Este módulo é puro de propósito: não importa nada que toque em rede ou em
 * React Native, para poder ser testado directamente com `node --test`. A parte
 * que fala com a Edge Function vive em `footballApi.ts`.
 *
 * A chave do football-data.org vive como secret de uma Edge Function, não no
 * bundle (ver `.env.example`). Enquanto essa função não estiver publicada, ou
 * sempre que a API falhar, entram os dados de exemplo daqui — e a UI diz que
 * são de exemplo, para ninguém os confundir com jogos reais.
 */

import type { Fixture, WinePairing } from '@/types';

export const COMPETICOES = {
  liga_pt: { id: 2017, nome: 'Liga Portugal', emoji: '🇵🇹' },
  liga_2: { id: 2016, nome: 'Liga 2', emoji: '🏟️' },
  ucl: { id: 2001, nome: 'Champions', emoji: '⭐' },
} as const;

export type ChaveCompeticao = keyof typeof COMPETICOES;

/** Mapa fixo da secção 10.8 da especificação. */
export const TEAM_WINE_PAIRINGS: Record<string, WinePairing> = {
  'SL Benfica': {
    wine_name: 'Esporão Reserva Tinto',
    producer: 'Herdade do Esporão',
    region: 'Alentejo',
    reason: 'Encorpado e generoso, à altura de uma noite na Luz.',
  },
  'FC Porto': {
    wine_name: 'Quinta do Crasto Reserva',
    producer: 'Quinta do Crasto',
    region: 'Douro',
    reason: 'Douro puro para o clube da cidade que deu nome ao vinho.',
  },
  'Sporting CP': {
    wine_name: 'Niepoort Redoma',
    producer: 'Niepoort',
    region: 'Douro',
    reason: 'Elegante e tenso, como um jogo decidido nos detalhes.',
  },
  'SC Braga': {
    wine_name: 'Anselmo Mendes Alvarinho',
    producer: 'Anselmo Mendes',
    region: 'Vinho Verde',
    reason: 'Do Minho, como o clube. Fresco e mineral.',
  },
  'Vitória SC': {
    wine_name: 'Soalheiro Primeiras Vinhas',
    producer: 'Soalheiro',
    region: 'Melgaço',
    reason: 'Alvarinho de vinhas velhas para a cidade berço.',
  },
  'Boavista FC': {
    wine_name: 'Herdade do Mouchão',
    producer: 'Mouchão',
    region: 'Alentejo',
    reason: 'Clássico e teimoso, como as axadrezadas.',
  },
  'Real Madrid': {
    wine_name: 'Barca Velha',
    producer: 'Casa Ferreirinha',
    region: 'Douro',
    reason: 'Para as noites europeias que se contam durante décadas.',
  },
  'FC Bayern München': {
    wine_name: 'Quinta do Vale Meão',
    producer: 'Vale Meão',
    region: 'Douro Superior',
    reason: 'Estrutura e potência para adversários da mesma escala.',
  },
  'Manchester City FC': {
    wine_name: 'Pêra Manca Tinto',
    producer: 'Cartuxa',
    region: 'Alentejo',
    reason: 'Raro e caro, como um bilhete para esta eliminatória.',
  },
};

export const PAIRING_POR_OMISSAO: WinePairing = {
  wine_name: 'Esporão Private Selection',
  producer: 'Herdade do Esporão',
  region: 'Alentejo',
  reason: 'Um tinto que não desilude, seja qual for o resultado.',
};

export function pairingParaJogo(fixture: Fixture): WinePairing {
  return (
    TEAM_WINE_PAIRINGS[fixture.homeTeam] ??
    TEAM_WINE_PAIRINGS[fixture.awayTeam] ??
    PAIRING_POR_OMISSAO
  );
}

/* ------------------------------------------------------------------ *
 * Dados de exemplo
 * ------------------------------------------------------------------ */

/**
 * Datas relativas a hoje, para os exemplos não ficarem obviamente velhos.
 * Não representam jogos reais — a UI assinala-o.
 */
function daquiA(dias: number, hora: number, minuto = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

export const EXEMPLOS: Record<ChaveCompeticao, Fixture[]> = {
  liga_pt: [
    { id: -1, homeTeam: 'SL Benfica', awayTeam: 'Sporting CP', date: daquiA(2, 20, 30), status: 'SCHEDULED', competition: 'Liga Portugal', matchday: 3 },
    { id: -2, homeTeam: 'FC Porto', awayTeam: 'SC Braga', date: daquiA(3, 18, 0), status: 'SCHEDULED', competition: 'Liga Portugal', matchday: 3 },
    { id: -3, homeTeam: 'Vitória SC', awayTeam: 'Boavista FC', date: daquiA(4, 15, 30), status: 'SCHEDULED', competition: 'Liga Portugal', matchday: 3 },
    { id: -4, homeTeam: 'Rio Ave FC', awayTeam: 'Moreirense FC', date: daquiA(-2, 21, 15), status: 'FINISHED', score: { home: 1, away: 1 }, competition: 'Liga Portugal', matchday: 2 },
  ],
  liga_2: [
    { id: -10, homeTeam: 'FC Penafiel', awayTeam: 'UD Oliveirense', date: daquiA(2, 11, 0), status: 'SCHEDULED', competition: 'Liga 2', matchday: 3 },
    { id: -11, homeTeam: 'Leixões SC', awayTeam: 'CD Feirense', date: daquiA(3, 14, 0), status: 'SCHEDULED', competition: 'Liga 2', matchday: 3 },
    { id: -12, homeTeam: 'SC Covilhã', awayTeam: 'GD Chaves', date: daquiA(-1, 18, 0), status: 'FINISHED', score: { home: 0, away: 2 }, competition: 'Liga 2', matchday: 2 },
  ],
  ucl: [
    { id: -20, homeTeam: 'SL Benfica', awayTeam: 'Real Madrid', date: daquiA(6, 20, 0), status: 'SCHEDULED', competition: 'Champions League' },
    { id: -21, homeTeam: 'Manchester City FC', awayTeam: 'FC Porto', date: daquiA(7, 20, 0), status: 'SCHEDULED', competition: 'Champions League' },
    { id: -22, homeTeam: 'FC Bayern München', awayTeam: 'Sporting CP', date: daquiA(8, 17, 45), status: 'SCHEDULED', competition: 'Champions League' },
  ],
};

/* ------------------------------------------------------------------ *
 * Apresentação
 * ------------------------------------------------------------------ */

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "sáb, 20:30" · "hoje, 18:00" · "amanhã, 15:30" */
export function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const dia = Math.round(
    (new Date(d).setHours(0, 0, 0, 0) - new Date(hoje).setHours(0, 0, 0, 0)) / 86_400_000,
  );

  const horas = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (dia === 0) return `hoje, ${horas}`;
  if (dia === 1) return `amanhã, ${horas}`;
  if (dia === -1) return `ontem, ${horas}`;
  return `${DIAS[d.getDay()]}, ${horas}`;
}

export function agrupaPorEstado(jogos: Fixture[]): {
  proximos: Fixture[];
  terminados: Fixture[];
} {
  const porData = (a: Fixture, b: Fixture) => a.date.localeCompare(b.date);
  return {
    proximos: jogos.filter((j) => j.status !== 'FINISHED').sort(porData),
    terminados: jogos.filter((j) => j.status === 'FINISHED').sort(porData).reverse(),
  };
}
