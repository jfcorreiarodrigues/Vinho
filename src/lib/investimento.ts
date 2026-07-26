/**
 * Matemática do portfólio de vinho.
 *
 * Módulo puro, sem I/O nem React Native — é onde vive a aritmética que, se
 * estiver errada, dá números plausíveis e errados no ecrã sem ninguém dar
 * por isso. Testado em `investimento.test.ts`.
 */

import { INFLACAO_PT_ANUAL, valorDeMercado, valorInvestido } from '@/store/selectors';
import type { Wine } from '@/types';

export interface ResumoPortfolio {
  investido: number;
  valorActual: number;
  lucro: number;
  roi_pct: number;
  /** Quanto valeria o mesmo dinheiro só a acompanhar a inflação. */
  seFosseInflacao: number;
  /** Diferença entre a cave e a inflação, em euros. */
  vantagem: number;
}

export interface PosicaoRegiao {
  regiao: string;
  investido: number;
  valorActual: number;
  garrafas: number;
  roi_pct: number;
}

export interface Performer {
  wine: Wine;
  investido: number;
  valorActual: number;
  lucro: number;
  roi_pct: number;
}

function arredondar(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Anos decorridos desde a compra; 0 quando não há data registada. */
export function anosDesdeCompra(wine: Wine, agora: Date = new Date()): number {
  if (!wine.purchase_date) return 0;
  const ms = agora.getTime() - new Date(wine.purchase_date).getTime();
  return Math.max(ms / 31_557_600_000, 0);
}

export function resumoPortfolio(
  wines: Wine[],
  agora: Date = new Date(),
): ResumoPortfolio {
  const investido = wines.reduce((s, w) => s + valorInvestido(w), 0);
  const valorActual = wines.reduce((s, w) => s + valorDeMercado(w), 0);

  // Cada compra é comparada com a inflação desde a sua própria data, não
  // desde a média — senão uma compra recente arrasta o resultado todo.
  const seFosseInflacao = wines.reduce((s, w) => {
    const anos = anosDesdeCompra(w, agora);
    return s + valorInvestido(w) * Math.pow(1 + INFLACAO_PT_ANUAL, anos);
  }, 0);

  return {
    investido: arredondar(investido),
    valorActual: arredondar(valorActual),
    lucro: arredondar(valorActual - investido),
    roi_pct: investido > 0 ? arredondar(((valorActual - investido) / investido) * 100) : 0,
    seFosseInflacao: arredondar(seFosseInflacao),
    vantagem: arredondar(valorActual - seFosseInflacao),
  };
}

/** Agrupa por região, da maior posição para a menor. */
export function porRegiao(wines: Wine[]): PosicaoRegiao[] {
  const mapa = new Map<string, PosicaoRegiao>();

  for (const w of wines) {
    const actual = mapa.get(w.region) ?? {
      regiao: w.region,
      investido: 0,
      valorActual: 0,
      garrafas: 0,
      roi_pct: 0,
    };
    actual.investido += valorInvestido(w);
    actual.valorActual += valorDeMercado(w);
    actual.garrafas += w.quantity;
    mapa.set(w.region, actual);
  }

  return [...mapa.values()]
    .map((p) => ({
      ...p,
      investido: arredondar(p.investido),
      valorActual: arredondar(p.valorActual),
      roi_pct:
        p.investido > 0
          ? arredondar(((p.valorActual - p.investido) / p.investido) * 100)
          : 0,
    }))
    .sort((a, b) => b.valorActual - a.valorActual);
}

/**
 * Melhores posições por ROI. Só entram vinhos com preço de compra: sem ele
 * o ROI é indefinido e apareceria como 0%, empurrando-os para o fundo da
 * lista como se fossem maus investimentos.
 */
export function topPerformers(wines: Wine[], quantos = 5): Performer[] {
  return wines
    .filter((w) => (w.purchase_price ?? 0) > 0)
    .map((w) => {
      const investido = valorInvestido(w);
      const actual = valorDeMercado(w);
      return {
        wine: w,
        investido: arredondar(investido),
        valorActual: arredondar(actual),
        lucro: arredondar(actual - investido),
        roi_pct: arredondar(((actual - investido) / investido) * 100),
      };
    })
    .sort((a, b) => b.roi_pct - a.roi_pct)
    .slice(0, quantos);
}

/**
 * Série de 12 meses para o gráfico de evolução.
 *
 * Interpola linearmente entre o investido e o valor actual. NÃO é histórico
 * real — em produção vem do Wine-Searcher. A UI tem de o assinalar, senão o
 * gráfico passa por um registo verdadeiro de valorização.
 */
export function serieSimulada(resumo: ResumoPortfolio, meses = 12): number[] {
  if (resumo.investido <= 0) return Array<number>(meses).fill(0);

  const passo = (resumo.valorActual - resumo.investido) / Math.max(meses - 1, 1);
  return Array.from({ length: meses }, (_, i) =>
    arredondar(resumo.investido + passo * i),
  );
}

/** Variação superior a 15% dispara notificação (secção 9.2). */
export function detectPriceSpike(precoAntigo: number, precoNovo: number): boolean {
  if (precoAntigo <= 0) return false;
  return Math.abs((precoNovo - precoAntigo) / precoAntigo) > 0.15;
}

/** Dicas baseadas na composição real da cave, não texto fixo. */
export function dicas(wines: Wine[]): string[] {
  const out: string[] = [];
  const regioes = porRegiao(wines);
  const total = wines.reduce((s, w) => s + valorDeMercado(w), 0);

  if (regioes.length > 0 && total > 0) {
    const maior = regioes[0];
    if (maior && maior.valorActual / total > 0.6) {
      out.push(
        `${Math.round((maior.valorActual / total) * 100)}% do valor da cave está em ${maior.regiao}. Diversificar por região reduz a exposição a uma só colheita.`,
      );
    }
  }

  const semPreco = wines.filter((w) => !w.purchase_price).length;
  if (semPreco > 0) {
    out.push(
      `${semPreco} ${semPreco === 1 ? 'vinho não tem' : 'vinhos não têm'} preço de compra registado — sem ele não é possível calcular o retorno.`,
    );
  }

  const naturais = wines.filter((w) => w.is_natural || w.is_low_intervention).length;
  if (naturais > 0) {
    out.push(
      'Vinhos de baixa intervenção têm procura crescente no mercado português, mas mercado secundário mais estreito do que os clássicos do Douro.',
    );
  }

  out.push(
    'Guardar acima dos 18 °C acelera a evolução e destrói valor. A temperatura é o factor com mais impacto na conservação.',
  );

  return out;
}
