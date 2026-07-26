import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EMOJI_POR_TIPO } from '@/components/CartaoVinho';
import { euros, percentagem, pontos } from '@/lib/formato';
import { useStore } from '@/store';
import {
  anoActual,
  estaNoPico,
  jaPassouDoPico,
  roiAnualizado,
  valorDeMercado,
  valorInvestido,
} from '@/store/selectors';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { Wine } from '@/types';

interface Props {
  wine: Wine;
  onFechar: () => void;
}

export function WineDetailScreen({ wine, onFechar }: Props) {
  const deleteWine = useStore((s) => s.deleteWine);
  const marketData = useStore((s) => s.marketData[wine.id]);

  const investido = valorInvestido(wine);
  const mercado = marketData
    ? marketData.average_price * wine.quantity
    : valorDeMercado(wine);

  const anosDetidos = wine.purchase_date
    ? Math.max(
        (Date.now() - new Date(wine.purchase_date).getTime()) / 31_557_600_000,
        0,
      )
    : 1;
  const roi = roiAnualizado(investido, mercado, anosDetidos);

  function confirmarRemocao() {
    Alert.alert(
      'Remover da cave?',
      `${wine.name} vai ser removido da tua cave. Esta acção não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            void deleteWine(wine.id).then((ok) => {
              if (ok) onFechar();
            });
          },
        },
      ],
    );
  }

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <View style={estilos.barra}>
          <Pressable
            onPress={onFechar}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Text style={estilos.fechar}>✕</Text>
          </Pressable>
        </View>

        <Text style={estilos.emoji}>{EMOJI_POR_TIPO[wine.wine_type]}</Text>
        <Text style={estilos.nome}>{wine.name}</Text>
        <Text style={estilos.produtor}>
          {[wine.producer, wine.subregion ?? wine.region].filter(Boolean).join(' · ')}
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.grelha}>
          <Facto
            etiqueta="Casta"
            valor={wine.grape_varieties[0] ?? '—'}
          />
          <Facto etiqueta="Ano" valor={wine.vintage ? String(wine.vintage) : '—'} />
          <Facto etiqueta="Região" valor={wine.region} />
          <Facto etiqueta="Garrafas" valor={String(wine.quantity)} />
        </View>

        <Text style={estilos.seccao}>Mercado</Text>
        <View style={estilos.mercado}>
          <View style={estilos.mercadoLinha}>
            <MercadoValor etiqueta="Compra" valor={wine.purchase_price} />
            <MercadoValor
              etiqueta="Actual"
              valor={wine.quantity > 0 ? mercado / wine.quantity : undefined}
              dourado
            />
            <MercadoValor etiqueta="Total" valor={mercado} />
          </View>

          {investido > 0 ? (
            <View style={estilos.roiCaixa}>
              <Text style={estilos.roiTexto}>
                {roi.profit_eur >= 0 ? '▲' : '▼'} {euros(Math.abs(roi.profit_eur))} (
                {percentagem(roi.roi_pct)}) desde a compra
              </Text>
              <Text style={estilos.roiInflacao}>
                {`${pontos(roi.vs_inflation_pct)} ${
                  roi.vs_inflation_pct >= 0 ? 'acima' : 'abaixo'
                } da inflação PT`}
              </Text>
            </View>
          ) : (
            <Text style={estilos.semPreco}>
              Sem preço de compra registado — edita o vinho para acompanhares o retorno.
            </Text>
          )}
        </View>

        {wine.maturation_window_start != null || wine.maturation_window_end != null ? (
          <>
            <Text style={estilos.seccao}>Janela de maturação</Text>
            <Maturacao wine={wine} />
          </>
        ) : null}

        {wine.tasting_notes ? (
          <>
            <Text style={estilos.seccao}>Notas de prova</Text>
            <Text style={estilos.notas}>{wine.tasting_notes}</Text>
          </>
        ) : null}

        {wine.food_pairings.length > 0 ? (
          <>
            <Text style={estilos.seccao}>Maridagem</Text>
            <View style={estilos.etiquetas}>
              {wine.food_pairings.map((p) => (
                <View key={p} style={estilos.etiqueta}>
                  <Text style={estilos.etiquetaTexto}>{p}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {wine.is_natural || wine.is_low_intervention || wine.is_organic || wine.is_biodynamic ? (
          <>
            <Text style={estilos.seccao}>Certificações</Text>
            <View style={estilos.etiquetas}>
              {wine.is_natural ? <Selo texto="🌿 Natural" /> : null}
              {wine.is_low_intervention ? <Selo texto="✋ Baixa intervenção" /> : null}
              {wine.is_organic ? <Selo texto="🌱 Biológico" /> : null}
              {wine.is_biodynamic ? <Selo texto="🌙 Biodinâmico" /> : null}
            </View>
          </>
        ) : null}

        <Pressable
          onPress={confirmarRemocao}
          style={estilos.remover}
          accessibilityRole="button"
        >
          <Text style={estilos.removerTexto}>Remover da cave</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Facto({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.facto}>
      <Text style={estilos.factoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.factoValor} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

function MercadoValor({
  etiqueta,
  valor,
  dourado = false,
}: {
  etiqueta: string;
  valor?: number;
  dourado?: boolean;
}) {
  return (
    <View style={estilos.mercadoItem}>
      <Text style={estilos.mercadoEtiqueta}>{etiqueta}</Text>
      <Text style={[estilos.mercadoValor, dourado ? { color: Colors.gold.light } : null]}>
        {valor != null ? euros(valor) : '—'}
      </Text>
    </View>
  );
}

/** Barra da janela de maturação com o cursor no ano actual. */
function Maturacao({ wine }: { wine: Wine }) {
  const ano = anoActual();
  const inicio = wine.maturation_window_start ?? ano;
  const fim = wine.maturation_window_end ?? inicio + 5;
  const total = Math.max(fim - inicio, 1);
  const posicao = Math.min(Math.max((ano - inicio) / total, 0), 1);

  const estado = jaPassouDoPico(wine)
    ? 'Já passou do pico — abrir quanto antes'
    : estaNoPico(wine)
      ? 'No pico — altura ideal para abrir'
      : `Ainda a evoluir — pico a partir de ${inicio}`;

  return (
    <View style={estilos.maturacao}>
      <View style={estilos.maturacaoAnos}>
        <Text style={estilos.maturacaoAno}>{inicio}</Text>
        <Text style={estilos.maturacaoAno}>{fim}</Text>
      </View>
      <View style={estilos.barraFundo}>
        <View style={[estilos.barraCursor, { left: `${posicao * 100}%` }]} />
      </View>
      <Text style={estilos.maturacaoEstado}>{estado}</Text>
    </View>
  );
}

function Selo({ texto }: { texto: string }) {
  return (
    <View style={[estilos.etiqueta, { backgroundColor: Colors.pureza.bg }]}>
      <Text style={[estilos.etiquetaTexto, { color: Colors.pureza.text }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: {
    backgroundColor: Colors.burgundy.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
  barra: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: Spacing.md },
  fechar: { fontSize: 22, color: Colors.cream.mid },
  emoji: { fontSize: 44, textAlign: 'center', marginBottom: Spacing.md },
  nome: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.cream.white,
    textAlign: 'center',
  },
  produtor: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.base,
    color: Colors.gold.light,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  conteudo: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  facto: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.cream.light,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  factoEtiqueta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  factoValor: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.lg,
    color: Colors.text.primary,
    marginTop: 2,
  },
  seccao: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.md,
  },
  mercado: { backgroundColor: Colors.burgundy.primary, borderRadius: Radius.lg, padding: Spacing.xl },
  mercadoLinha: { flexDirection: 'row', justifyContent: 'space-around' },
  mercadoItem: { alignItems: 'center' },
  mercadoEtiqueta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    color: Colors.cream.mid,
  },
  mercadoValor: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.cream.white,
    marginTop: 2,
  },
  roiCaixa: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  roiTexto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.cream.white,
  },
  roiInflacao: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.gold.light,
    marginTop: 2,
  },
  semPreco: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.cream.mid,
    marginTop: Spacing.lg,
  },
  maturacao: { backgroundColor: Colors.cream.light, borderRadius: Radius.lg, padding: Spacing.xl },
  maturacaoAnos: { flexDirection: 'row', justifyContent: 'space-between' },
  maturacaoAno: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.burgundy.primary,
  },
  barraFundo: {
    height: 6,
    backgroundColor: Colors.cream.dark,
    borderRadius: 3,
    marginVertical: Spacing.md,
    justifyContent: 'center',
  },
  barraCursor: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    backgroundColor: Colors.burgundy.primary,
    borderWidth: 2,
    borderColor: Colors.cream.white,
  },
  maturacaoEstado: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.burgundy.mid,
  },
  notas: {
    fontFamily: Typography.fonts.serifItalic,
    fontSize: Typography.sizes.xl,
    lineHeight: 27,
    color: Colors.text.secondary,
  },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  etiqueta: {
    backgroundColor: Colors.cream.light,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  etiquetaTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  remover: {
    marginTop: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.status.dangerText,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  removerTexto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.status.dangerText,
  },
});
