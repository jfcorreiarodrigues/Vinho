import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PAIRING_POR_OMISSAO,
  TEAM_WINE_PAIRINGS,
  agrupaPorEstado,
  pairingParaJogo,
  quando,
} from '@/lib/football';
import { getSeasonalProducts, venuesParaMatchDay, LISBON_WINE_VENUES } from '@/lib/lisboaAberta';
import type { Fixture } from '@/types';

function jogo(o: Partial<Fixture> = {}): Fixture {
  return {
    id: 1, homeTeam: 'SL Benfica', awayTeam: 'Sporting CP',
    date: new Date().toISOString(), status: 'SCHEDULED',
    competition: 'Liga Portugal', ...o,
  };
}

test('maridagem escolhe a equipa da casa quando ambas têm mapa', () => {
  const p = pairingParaJogo(jogo({ homeTeam: 'FC Porto', awayTeam: 'SL Benfica' }));
  assert.equal(p.wine_name, TEAM_WINE_PAIRINGS['FC Porto']?.wine_name);
});

test('cai na equipa visitante se a da casa não tiver mapa', () => {
  const p = pairingParaJogo(jogo({ homeTeam: 'Equipa Desconhecida', awayTeam: 'SC Braga' }));
  assert.equal(p.region, 'Vinho Verde');
});

test('duas equipas sem mapa usam o vinho por omissão', () => {
  const p = pairingParaJogo(jogo({ homeTeam: 'A', awayTeam: 'B' }));
  assert.equal(p.wine_name, PAIRING_POR_OMISSAO.wine_name);
});

test('todas as maridagens têm produtor, região e justificação', () => {
  for (const [equipa, p] of Object.entries(TEAM_WINE_PAIRINGS)) {
    assert.ok(p.wine_name.length > 0, `${equipa} sem vinho`);
    assert.ok(p.producer.length > 0, `${equipa} sem produtor`);
    assert.ok(p.region.length > 0, `${equipa} sem região`);
    assert.ok(p.reason.length > 10, `${equipa} sem justificação`);
  }
});

test('datas relativas em português', () => {
  const hoje = new Date(); hoje.setHours(20, 30, 0, 0);
  assert.match(quando(hoje.toISOString()), /^hoje, 20:30$/);

  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1); amanha.setHours(9, 5, 0, 0);
  assert.match(quando(amanha.toISOString()), /^amanhã, 09:05$/);

  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); ontem.setHours(18, 0, 0, 0);
  assert.match(quando(ontem.toISOString()), /^ontem, 18:00$/);
});

test('agrupa separa terminados de próximos', () => {
  const { proximos, terminados } = agrupaPorEstado([
    jogo({ id: 1, status: 'SCHEDULED' }),
    jogo({ id: 2, status: 'FINISHED' }),
    jogo({ id: 3, status: 'LIVE' }),
  ]);
  assert.equal(proximos.length, 2);
  assert.equal(terminados.length, 1);
});

test('produtos sazonais mudam com a estação', () => {
  const verao = getSeasonalProducts(new Date('2026-07-15')).map((p) => p.id);
  const inverno = getSeasonalProducts(new Date('2026-01-15')).map((p) => p.id);
  assert.ok(verao.includes('sardinha'), 'sardinha devia ser de verão');
  assert.ok(inverno.includes('bacalhau'), 'bacalhau devia ser de inverno');
  assert.notDeepEqual(verao, inverno);
});

test('cada estação tem pelo menos um produto', () => {
  for (const mes of [0, 3, 6, 9]) {
    const d = new Date(2026, mes, 15);
    assert.ok(getSeasonalProducts(d).length > 0, `mês ${mes} sem produtos`);
  }
});

test('venues têm os campos que o ecrã mostra', () => {
  assert.ok(LISBON_WINE_VENUES.length >= 8, 'a spec pede pelo menos 8 venues');
  for (const v of LISBON_WINE_VENUES) {
    assert.ok(v.name && v.address && v.neighborhood, `${v.id} incompleto`);
    assert.ok(v.rating > 0 && v.rating <= 5, `${v.id} com rating inválido`);
    assert.ok([1, 2, 3, 4].includes(v.price_range), `${v.id} com escalão inválido`);
  }
});

test('há parceiros de match day', () => {
  assert.ok(venuesParaMatchDay().length > 0);
});
