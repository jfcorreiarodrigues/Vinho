import { useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

import { euros, percentagem } from '@/lib/formato';
import {
  dicas,
  porRegiao,
  resumoPortfolio,
  serieSimulada,
  topPerformers,
} from '@/lib/investimento';
import { useStore } from '@/store';
import { INFLACAO_PT_ANUAL } from '@/store/selectors';
import { Colors, Radius, Spacing, Typography } from '@/theme';

const MESES = ['A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J'];

interface Props {
  onFechar: () => void;
}

export function InvestmentScreen({ onFechar }: Props) {
  const wines = useStore((s) => s.wines);
  const user = useStore((s) => s.user);
  const premium = user?.plan === 'premium';

  const resumo = useMemo(() => resumoPortfolio(wines), [wines]);
  const regioes = useMemo(() => porRegiao(wines), [wines]);
  const melhores = useMemo(() => topPerformers(wines), [wines]);
  const conselhos = useMemo(() => dicas(wines), [wines]);
  const serie = useMemo(() => serieSimulada(resumo), [resumo]);

  const largura = Dimensions.get('window').width - Spacing.xl * 2;
  const maxRegiao = Math.max(...regioes.map((r) => r.valorActual), 1);
  const semDados = resumo.investido === 0;

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <View style={estilos.barra}>
          <View>
            <Text style={estilos.titulo}>Portfolio</Text>
            <Text style={estilos.subtitulo}>Investimento em vinho</Text>
          </View>
          <Pressable onPress={onFechar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
            <Text style={estilos.fechar}>✕</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        {semDados ? (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioEmoji}>📈</Text>
            <Text style={estilos.vazioTitulo}>Ainda não há nada para analisar</Text>
            <Text style={estilos.vazioTexto}>
              Regista o preço de compra dos teus vinhos e o portfólio começa a
              ganhar forma.
            </Text>
          </View>
        ) : (
          <>
            <View style={estilos.grelha}>
              <Cartao etiqueta="Investido" valor={euros(resumo.investido)} />
              <Cartao etiqueta="Valor actual" valor={euros(resumo.valorActual)} />
              <Cartao
                etiqueta={resumo.lucro >= 0 ? 'Ganho' : 'Perda'}
                valor={euros(Math.abs(resumo.lucro))}
                tom={resumo.lucro >= 0 ? 'positivo' : 'negativo'}
              />
              <Cartao
                etiqueta="ROI total"
                valor={percentagem(resumo.roi_pct)}
                tom={resumo.roi_pct >= 0 ? 'positivo' : 'negativo'}
              />
            </View>

            <Text style={estilos.seccao}>vs. inflação portuguesa</Text>
            <View
              style={[
                estilos.comparacao,
                { borderColor: resumo.vantagem >= 0 ? Colors.pureza.text : Colors.status.dangerText },
              ]}
            >
              <View style={estilos.comparacaoLinha}>
                <Text style={estilos.comparacaoEtiqueta}>
                  Se tivesse acompanhado a inflação ({percentagem(INFLACAO_PT_ANUAL * 100, 1, false)}/ano)
                </Text>
                <Text style={estilos.comparacaoValor}>{euros(resumo.seFosseInflacao)}</Text>
              </View>
              <View style={estilos.comparacaoLinha}>
                <Text style={estilos.comparacaoEtiqueta}>Valor real da cave</Text>
                <Text style={estilos.comparacaoValor}>{euros(resumo.valorActual)}</Text>
              </View>
              <View style={estilos.comparacaoDestaque}>
                <Text
                  style={[
                    estilos.comparacaoResultado,
                    { color: resumo.vantagem >= 0 ? Colors.pureza.text : Colors.status.dangerText },
                  ]}
                >
                  {resumo.vantagem >= 0 ? '▲' : '▼'} {euros(Math.abs(resumo.vantagem))}{' '}
                  {resumo.vantagem >= 0 ? 'acima' : 'abaixo'} da inflação
                </Text>
              </View>
            </View>

            <Text style={estilos.seccao}>Evolução (12 meses)</Text>
            {premium ? (
              <View style={estilos.grafico}>
                <LineChart
                  data={{ labels: MESES, datasets: [{ data: serie }] }}
                  width={largura - Spacing.xl}
                  height={200}
                  withDots={false}
                  withInnerLines={false}
                  yAxisLabel=""
                  yAxisSuffix=""
                  // O chart-kit formata os rótulos à americana por omissão.
                  formatYLabel={(v) => euros(Number(v))}
                  chartConfig={{
                    backgroundGradientFrom: Colors.cream.light,
                    backgroundGradientTo: Colors.cream.light,
                    decimalPlaces: 0,
                    color: (o = 1) => `rgba(61, 11, 11, ${o})`,
                    labelColor: () => Colors.text.muted,
                    propsForBackgroundLines: { stroke: Colors.cream.dark },
                  }}
                  bezier
                  style={estilos.graficoInterno}
                />
                <Text style={estilos.graficoNota}>
                  Série interpolada entre a compra e o valor actual. O histórico real
                  precisa da ligação ao Wine-Searcher.
                </Text>
              </View>
            ) : (
              <Bloqueado />
            )}

            <Text style={estilos.seccao}>Por região</Text>
            <View style={estilos.regioes}>
              {regioes.map((r) => (
                <View key={r.regiao} style={estilos.regiao}>
                  <View style={estilos.regiaoTopo}>
                    <Text style={estilos.regiaoNome}>{r.regiao}</Text>
                    <Text style={estilos.regiaoValor}>{euros(r.valorActual)}</Text>
                  </View>
                  <View style={estilos.regiaoBarraFundo}>
                    <View
                      style={[
                        estilos.regiaoBarra,
                        { width: `${(r.valorActual / maxRegiao) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={estilos.regiaoMeta}>
                    {r.garrafas} {r.garrafas === 1 ? 'garrafa' : 'garrafas'} ·{' '}
                    {percentagem(r.roi_pct)}
                  </Text>
                </View>
              ))}
            </View>

            {melhores.length > 0 ? (
              <>
                <Text style={estilos.seccao}>Melhores posições</Text>
                {melhores.map((p, i) => (
                  <View key={p.wine.id} style={estilos.performer}>
                    <Text style={estilos.posicao}>{i + 1}</Text>
                    <View style={estilos.performerInfo}>
                      <Text style={estilos.performerNome} numberOfLines={1}>
                        {p.wine.name}
                      </Text>
                      <Text style={estilos.performerMeta}>
                        {p.wine.region} · {euros(p.investido)} → {euros(p.valorActual)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        estilos.performerRoi,
                        { color: p.roi_pct >= 0 ? Colors.pureza.text : Colors.status.dangerText },
                      ]}
                    >
                      {percentagem(p.roi_pct, 0)}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}

        <Text style={estilos.seccao}>A ter em conta</Text>
        {conselhos.map((d) => (
          <View key={d} style={estilos.dica}>
            <Text style={estilos.dicaTexto}>{d}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Cartao({
  etiqueta,
  valor,
  tom = 'normal',
}: {
  etiqueta: string;
  valor: string;
  tom?: 'normal' | 'positivo' | 'negativo';
}) {
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.cartaoEtiqueta}>{etiqueta}</Text>
      <Text
        style={[
          estilos.cartaoValor,
          tom === 'positivo' ? { color: Colors.pureza.text } : null,
          tom === 'negativo' ? { color: Colors.status.dangerText } : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valor}
      </Text>
    </View>
  );
}

function Bloqueado() {
  return (
    <View style={estilos.bloqueado}>
      <Text style={estilos.bloqueadoEmoji}>🔒</Text>
      <Text style={estilos.bloqueadoTitulo}>Gráficos no Premium</Text>
      <Text style={estilos.bloqueadoTexto}>
        A evolução mês a mês, os alertas de preço e o histórico completo fazem
        parte do plano Premium.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: { backgroundColor: Colors.burgundy.primary, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: Spacing.md },
  titulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['3xl'], color: Colors.cream.white },
  subtitulo: { fontFamily: Typography.fonts.sansLight, fontSize: Typography.sizes.sm, color: Colors.gold.light, marginTop: 2 },
  fechar: { fontSize: 22, color: Colors.cream.mid },
  conteudo: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  cartao: { flexBasis: '47%', flexGrow: 1, backgroundColor: Colors.cream.light, borderRadius: Radius.md, padding: Spacing.xl },
  cartaoEtiqueta: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs, color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  cartaoValor: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['2xl'], color: Colors.burgundy.primary, marginTop: Spacing.xs },
  seccao: {
    fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.xs,
    color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.7,
    marginTop: Spacing['3xl'], marginBottom: Spacing.md,
  },
  comparacao: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md },
  comparacaoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comparacaoEtiqueta: { flex: 1, fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  comparacaoValor: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  comparacaoDestaque: { borderTopWidth: 1, borderTopColor: Colors.cream.mid, paddingTop: Spacing.md },
  comparacaoResultado: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.lg },
  grafico: { backgroundColor: Colors.cream.light, borderRadius: Radius.lg, padding: Spacing.md },
  graficoInterno: { borderRadius: Radius.md },
  graficoNota: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs, color: Colors.text.muted, padding: Spacing.md, lineHeight: 15 },
  bloqueado: { backgroundColor: Colors.burgundy.primary, borderRadius: Radius.lg, padding: Spacing['3xl'], alignItems: 'center', gap: Spacing.md },
  bloqueadoEmoji: { fontSize: 30 },
  bloqueadoTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.cream.white },
  bloqueadoTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.cream.mid, textAlign: 'center', lineHeight: 19 },
  regioes: { gap: Spacing.xl },
  regiao: {},
  regiaoTopo: { flexDirection: 'row', justifyContent: 'space-between' },
  regiaoNome: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  regiaoValor: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.burgundy.primary },
  regiaoBarraFundo: { height: 8, backgroundColor: Colors.cream.mid, borderRadius: 4, marginTop: Spacing.sm, overflow: 'hidden' },
  regiaoBarra: { height: '100%', backgroundColor: Colors.burgundy.primary, borderRadius: 4 },
  regiaoMeta: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: Spacing.xs },
  performer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.cream.mid, paddingVertical: Spacing.lg,
  },
  posicao: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.gold.deep, width: 22 },
  performerInfo: { flex: 1 },
  performerNome: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  performerMeta: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 1 },
  performerRoi: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl },
  dica: { backgroundColor: Colors.cream.light, borderRadius: Radius.md, padding: Spacing.xl, marginBottom: Spacing.md },
  dicaTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.secondary, lineHeight: 20 },
  vazio: { alignItems: 'center', padding: Spacing['3xl'], gap: Spacing.md },
  vazioEmoji: { fontSize: 44 },
  vazioTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.burgundy.primary },
  vazioTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.muted, textAlign: 'center', lineHeight: 21 },
});
