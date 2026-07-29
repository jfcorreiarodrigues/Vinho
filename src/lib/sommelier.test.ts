import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_VINHOS_NO_CONTEXTO,
  construirSystemPrompt,
  criarMensagem,
  descreverClima,
  historicoParaModelo,
  mensagemInicial,
  resumirCave,
  saudacaoHora,
} from '@/lib/sommelier';
import type { Message, Wine } from '@/types';

function v(o: Partial<Wine> & { id: string }): Wine {
  return { user_id:'u', name:'Vinho', producer:'Produtor', region:'Douro', country:'Portugal',
    wine_type:'tinto', grape_varieties:[], quantity:1, food_pairings:[], is_natural:false,
    is_low_intervention:false, is_organic:false, is_biodynamic:false, source:'manual',
    created_at:'2026-01-01', updated_at:'2026-01-01', ...o };
}
const ANO = new Date().getFullYear();

test('saudação segue a hora do dia', () => {
  assert.equal(saudacaoHora(new Date('2026-07-26T09:00:00')), 'Bom dia');
  assert.equal(saudacaoHora(new Date('2026-07-26T15:00:00')), 'Boa tarde');
  assert.equal(saudacaoHora(new Date('2026-07-26T22:00:00')), 'Boa noite');
});

test('cave vazia é dita explicitamente', () => {
  assert.match(resumirCave([]), /vazia/);
});

test('vinhos fora do pico vêm primeiro — são os accionáveis', () => {
  const r = resumirCave([
    v({ id:'futuro', name:'Futuro', maturation_window_start: ANO + 5 }),
    v({ id:'passou', name:'Passou', maturation_window_end: ANO - 1 }),
    v({ id:'pico', name:'Pico', maturation_window_start: ANO - 1, maturation_window_end: ANO + 1 }),
  ]);
  const linhas = r.split('\n');
  assert.match(linhas[0]!, /Passou/, 'o que já passou devia vir primeiro');
  assert.match(linhas[1]!, /Pico/);
});

test('cave grande é truncada e o resto é contado', () => {
  const muitos = Array.from({ length: 60 }, (_, i) => v({ id:`w${i}` }));
  const r = resumirCave(muitos);
  const linhas = r.split('\n');
  assert.equal(linhas.length, MAX_VINHOS_NO_CONTEXTO + 1);
  assert.match(linhas.at(-1)!, /mais 35 vinhos/);
});

test('estado do pico aparece no resumo', () => {
  assert.match(resumirCave([v({ id:'a', maturation_window_end: ANO - 1 })]), /JÁ PASSOU DO PICO/);
  assert.match(resumirCave([v({ id:'b', maturation_window_start: ANO - 1, maturation_window_end: ANO + 1 })]), /NO PICO/);
});

test('clima desconhecido não inventa', () => {
  assert.match(descreverClima(null), /desconhecido/);
});

test('clima quente é assinalado', () => {
  const d = descreverClima({ temp_c: 31, condition:'céu limpo', icon:'', is_hot:true, is_cold:false, is_rainy:false });
  assert.match(d, /31°C/);
  assert.match(d, /calor/);
});

test('system prompt proíbe inventar e impõe PT-PT', () => {
  const p = construirSystemPrompt([v({ id:'a', producer:'Niepoort', name:'Redoma' })], null);
  assert.match(p, /português europeu/);
  assert.match(p, /Nunca português do Brasil/);
  assert.match(p, /não inventes/);
  assert.match(p, /Niepoort Redoma/, 'a cave tem de estar no prompt');
});

test('histórico é cortado às últimas trocas', () => {
  const msgs: Message[] = Array.from({ length: 30 }, (_, i) => ({
    id:`m${i}`, role: i % 2 === 0 ? 'user' : 'sommelier', content:`msg ${i}`, timestamp:'',
  }));
  const h = historicoParaModelo(msgs);
  assert.equal(h.length, 10);
  assert.equal(h.at(-1)!.text, 'msg 29', 'devia manter as mais recentes');
});

test('papéis são traduzidos para o formato do modelo', () => {
  const h = historicoParaModelo([
    { id:'1', role:'user', content:'olá', timestamp:'' },
    { id:'2', role:'sommelier', content:'boa tarde', timestamp:'' },
  ]);
  assert.deepEqual(h.map((m) => m.role), ['user', 'model']);
});

test('primeira mensagem destaca vinhos no pico', () => {
  const m = mensagemInicial(
    [v({ id:'a', producer:'Niepoort', name:'Redoma', maturation_window_start: ANO - 1, maturation_window_end: ANO + 1 })],
    null,
    new Date('2026-07-26T10:00:00'),
  );
  assert.match(m, /Bom dia/);
  assert.match(m, /Niepoort Redoma/);
});

test('cave vazia recebe mensagem própria', () => {
  assert.match(mensagemInicial([], null), /Ainda não conheço a sua cave/);
});

test('cada mensagem tem id único', () => {
  const ids = new Set(Array.from({ length: 50 }, () => criarMensagem('user', 'x').id));
  assert.equal(ids.size, 50);
});
