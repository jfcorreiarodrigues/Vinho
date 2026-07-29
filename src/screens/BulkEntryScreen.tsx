import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { EMOJI_POR_TIPO } from '@/components/CartaoVinho';
import { totalDasLinhas, totalDeGarrafas, totalDivergente, type LinhaLote, type ResultadoLote } from '@/lib/bulk';
import { lerLote, type TipoLote } from '@/lib/bulkApi';
import { euros } from '@/lib/formato';
import { escolherImagem } from '@/lib/gemini';
import { useStore } from '@/store';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { WineInput } from '@/types';

interface Props {
  tipo: TipoLote;
  onFechar: () => void;
}

export function BulkEntryScreen({ tipo, onFechar }: Props) {
  const user = useStore((s) => s.user);
  const addWinesBulk = useStore((s) => s.addWinesBulk);
  const erroStore = useStore((s) => s.error);

  const [resultado, setResultado] = useState<ResultadoLote | null>(null);
  const [aLer, setALer] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fatura = tipo === 'fatura';

  async function ler(origem: 'camara' | 'galeria') {
    setErro(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const base64 = await escolherImagem(origem);
    if (!base64) return;

    setALer(true);
    const r = await lerLote(base64, tipo);
    setALer(false);

    if (!r.ok) {
      setErro(r.error);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResultado(r.data);
  }

  function remover(id: string) {
    setResultado((r) =>
      r ? { ...r, linhas: r.linhas.filter((l) => l.id !== id) } : r,
    );
  }

  async function guardar() {
    if (!user || !resultado) return;
    setAGuardar(true);

    const vinhos: WineInput[] = resultado.linhas.map((l) => ({
      user_id: user.id,
      name: l.name,
      producer: l.producer || l.name,
      region: l.region || 'Portugal',
      country: 'Portugal',
      wine_type: l.wine_type,
      grape_varieties: [],
      vintage: l.vintage,
      quantity: l.quantity,
      purchase_price: l.purchase_price,
      purchase_date: resultado.invoice_date ?? new Date().toISOString().slice(0, 10),
      food_pairings: [],
      is_natural: false,
      is_low_intervention: false,
      is_organic: false,
      is_biodynamic: false,
      source: fatura ? 'bulk_invoice' : 'shelf_scan',
    }));

    const ok = await addWinesBulk(vinhos);
    setAGuardar(false);
    if (ok) onFechar();
  }

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <View style={estilos.barra}>
          <View>
            <Text style={estilos.titulo}>{fatura ? 'Fatura' : 'Prateleira'}</Text>
            <Text style={estilos.subtitulo}>
              {fatura ? 'Vários vinhos de uma vez' : 'Digitaliza a cave'}
            </Text>
          </View>
          <Pressable onPress={onFechar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
            <Text style={estilos.fechar}>✕</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {resultado === null ? (
        <ScrollView contentContainerStyle={estilos.conteudo}>
          <Text style={estilos.explicacao}>
            {fatura
              ? 'Fotografa a fatura da garrafeira. Extraio os vinhos, quantidades e preços para reveres antes de gravar.'
              : 'Fotografa a prateleira com os rótulos à vista. Identifico as garrafas que conseguir ler.'}
          </Text>

          {erro ? (
            <View style={estilos.erro} accessibilityLiveRegion="polite">
              <Text style={estilos.erroTexto}>{erro}</Text>
            </View>
          ) : null}

          <Botao titulo="Tirar foto" onPress={() => void ler('camara')} ocupado={aLer} />
          <Pressable onPress={() => void ler('galeria')} style={estilos.galeria} accessibilityRole="button">
            <Text style={estilos.galeriaTexto}>ou escolher da galeria</Text>
          </Pressable>

          {aLer ? (
            <View style={estilos.aLer}>
              <ActivityIndicator color={Colors.burgundy.primary} />
              <Text style={estilos.aLerTexto}>
                {fatura ? 'A ler a fatura…' : 'A identificar garrafas…'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={estilos.conteudo}>
            {resultado.store_name || resultado.invoice_date ? (
              <View style={estilos.meta}>
                {resultado.store_name ? (
                  <Text style={estilos.metaLoja}>{resultado.store_name}</Text>
                ) : null}
                {resultado.invoice_date ? (
                  <Text style={estilos.metaData}>{resultado.invoice_date}</Text>
                ) : null}
              </View>
            ) : null}

            {/* A conferência que o utilizador faria a olho, feita pela app. */}
            {totalDivergente(resultado) ? (
              <View style={estilos.aviso}>
                <Text style={estilos.avisoTexto}>
                  A soma das linhas ({euros(totalDasLinhas(resultado.linhas))}) não bate
                  com o total da fatura ({euros(resultado.total_amount ?? 0)}). Pode ter
                  escapado alguma linha — confirma antes de gravar.
                </Text>
              </View>
            ) : null}

            {resultado.descartadas > 0 ? (
              <Text style={estilos.descartadas}>
                {resultado.descartadas}{' '}
                {resultado.descartadas === 1 ? 'linha ilegível foi ignorada' : 'linhas ilegíveis foram ignoradas'}.
              </Text>
            ) : null}

            {resultado.linhas.map((l) => (
              <LinhaVinho key={l.id} linha={l} onRemover={() => remover(l.id)} />
            ))}

            {erroStore ? (
              <View style={estilos.erro}>
                <Text style={estilos.erroTexto}>{erroStore}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={estilos.rodape}>
            <Text style={estilos.resumo}>
              {totalDeGarrafas(resultado.linhas)} garrafas ·{' '}
              {euros(totalDasLinhas(resultado.linhas))}
            </Text>
            <Botao
              titulo={
                resultado.linhas.length === 0
                  ? 'Nada para adicionar'
                  : `Adicionar ${resultado.linhas.length} ${resultado.linhas.length === 1 ? 'vinho' : 'vinhos'}`
              }
              onPress={() => void guardar()}
              ocupado={aGuardar}
              desactivado={resultado.linhas.length === 0}
            />
          </View>
        </>
      )}
    </View>
  );
}

function LinhaVinho({ linha, onRemover }: { linha: LinhaLote; onRemover: () => void }) {
  const duvidosa = linha.confidence !== undefined && linha.confidence < 0.6;

  return (
    <View style={[estilos.linha, duvidosa ? estilos.linhaDuvidosa : null]}>
      <Text style={estilos.linhaEmoji}>{EMOJI_POR_TIPO[linha.wine_type]}</Text>
      <View style={estilos.linhaInfo}>
        <Text style={estilos.linhaNome} numberOfLines={1}>
          {linha.name}
        </Text>
        <Text style={estilos.linhaMeta} numberOfLines={1}>
          {[linha.producer, linha.region, linha.vintage].filter(Boolean).join(' · ') || '—'}
        </Text>
        {duvidosa ? <Text style={estilos.linhaAviso}>leitura incerta</Text> : null}
      </View>
      <View style={estilos.linhaDireita}>
        <Text style={estilos.linhaQtd}>×{linha.quantity}</Text>
        {linha.purchase_price !== undefined ? (
          <Text style={estilos.linhaPreco}>{euros(linha.purchase_price)}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={onRemover}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remover ${linha.name}`}
        style={estilos.remover}
      >
        <Text style={estilos.removerTexto}>✕</Text>
      </Pressable>
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
  explicacao: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.secondary, lineHeight: 21, marginBottom: Spacing['2xl'] },
  erro: { backgroundColor: Colors.status.dangerBg, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  erroTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.status.dangerText, lineHeight: 20 },
  galeria: { alignItems: 'center', paddingVertical: Spacing.xl },
  galeriaTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.burgundy.mid },
  aLer: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing['2xl'] },
  aLerTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.muted },
  meta: { marginBottom: Spacing.xl },
  metaLoja: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['2xl'], color: Colors.burgundy.primary },
  metaData: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  aviso: { backgroundColor: Colors.status.warningBg, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  avisoTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.status.warningText, lineHeight: 19 },
  descartadas: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginBottom: Spacing.lg },
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.cream.white, borderWidth: 1, borderColor: Colors.cream.mid,
    borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  linhaDuvidosa: { borderColor: Colors.status.warningText, backgroundColor: Colors.status.warningBg },
  linhaEmoji: { fontSize: 20 },
  linhaInfo: { flex: 1, minWidth: 0 },
  linhaNome: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  linhaMeta: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 1 },
  linhaAviso: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs, color: Colors.status.warningText, marginTop: 2 },
  linhaDireita: { alignItems: 'flex-end' },
  linhaQtd: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  linhaPreco: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  remover: { padding: Spacing.sm },
  removerTexto: { fontSize: Typography.sizes.lg, color: Colors.text.muted },
  rodape: {
    borderTopWidth: 1, borderTopColor: Colors.cream.mid,
    padding: Spacing.xl, gap: Spacing.lg, backgroundColor: Colors.cream.white,
  },
  resumo: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.secondary, textAlign: 'center' },
});
