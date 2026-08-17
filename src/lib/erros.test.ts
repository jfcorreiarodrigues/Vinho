import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mensagemDeLigacao, traduzErro } from '@/lib/erros';

test('offline culpa a rede do utilizador', () => {
  assert.match(mensagemDeLigacao('offline'), /Sem ligação à internet/);
});

test('online com falha de fetch não culpa a rede do utilizador', () => {
  const m = mensagemDeLigacao('online');
  assert.doesNotMatch(m, /Sem ligação à internet/);
  assert.match(m, /servidor não respondeu/);
});

test('estado desconhecido não afirma nenhum dos dois', () => {
  const m = mensagemDeLigacao('desconhecido');
  assert.doesNotMatch(m, /Sem ligação à internet\./);
  assert.match(m, /Verifica a ligação ou tenta daqui a pouco/);
});

// O caso que enganou de facto: projeto Supabase pausado, com o utilizador
// perfeitamente ligado à internet. O browser devolve "Failed to fetch" na
// mesma, e a mensagem antiga mandava-o verificar a rede.
test('projeto em baixo com utilizador online aponta para o servidor', () => {
  const m = traduzErro(new Error('Failed to fetch'), 'online');
  assert.match(m, /A tua ligação está boa/);
});

test('as várias formas de falha de rede caem todas na mesma mensagem', () => {
  for (const texto of [
    'Failed to fetch',
    'Network request failed',
    'NetworkError when attempting to fetch resource',
    'TypeError: fetch failed',
  ]) {
    assert.equal(traduzErro(new Error(texto), 'offline'), mensagemDeLigacao('offline'));
  }
});

test('erros de negócio não são afectados pelo estado da rede', () => {
  assert.match(
    traduzErro(new Error('Invalid login credentials'), 'online'),
    /Email ou palavra-passe incorrectos/,
  );
  assert.match(
    traduzErro(new Error('User already registered'), 'offline'),
    /Já existe uma conta com este email/,
  );
});

test('limite do plano free explica o limite e a saída', () => {
  const m = traduzErro(new Error('LIMITE_PLANO_FREE: excedido'));
  assert.match(m, /50 garrafas/);
  assert.match(m, /Premium/);
});

test('erro nulo devolve mensagem genérica em vez de rebentar', () => {
  assert.equal(traduzErro(null), 'Ocorreu um erro inesperado.');
});

test('erro desconhecido não expõe o texto original ao utilizador', () => {
  const m = traduzErro(new Error('PGRST301: JWT expired at segment 3'));
  assert.doesNotMatch(m, /PGRST301|JWT/);
});
