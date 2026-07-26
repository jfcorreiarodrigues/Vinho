/**
 * Formatação numérica em português europeu.
 *
 * Escrito à mão em vez de `Intl.NumberFormat`: o Hermes só inclui ICU
 * completo em algumas configurações, e um fallback silencioso para o formato
 * inglês passaria despercebido até alguém reparar num "1,152.50€" no ecrã.
 *
 * Convenção PT: ponto separa milhares, vírgula separa decimais.
 */

/** 1234.5 → "1.234,50" · 1000 → "1.000" */
export function numero(valor: number, casas = 2): string {
  const negativo = valor < 0;
  const fixo = Math.abs(valor).toFixed(casas);
  const [inteiro = '0', decimais = ''] = fixo.split('.');

  const comMilhares = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const semDecimais = decimais === '' || Number(decimais) === 0;

  return `${negativo ? '-' : ''}${comMilhares}${semDecimais ? '' : `,${decimais}`}`;
}

/** 1152 → "1.152€" · 38.5 → "38,50€" */
export function euros(valor: number): string {
  return `${numero(valor)}€`;
}

/** 14.17 → "+14,17%" · -3.2 → "-3,2%" */
export function percentagem(valor: number, casas = 2, comSinal = true): string {
  const sinal = comSinal && valor > 0 ? '+' : '';
  return `${sinal}${numero(valor, casas)}%`;
}

/** 23.9 → "23,9 pontos" — para a comparação com a inflação. */
export function pontos(valor: number): string {
  const n = numero(Math.abs(valor), 1);
  return `${n} ${n === '1' ? 'ponto' : 'pontos'}`;
}
