import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { CartaoVinho, EMOJI_POR_TIPO } from '@/components/CartaoVinho';
import { escolherImagem, scanWineLabel } from '@/lib/gemini';
import { precisaConfirmacao, scanParaWine } from '@/lib/scan';
import { useStore } from '@/store';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/theme';
import type { ScanResult, Wine } from '@/types';

interface Props {
  onAbrirVinho: (wine: Wine) => void;
  onEntradaManual: () => void;
  onAbrirPortfolio: () => void;
  onAbrirLote: (tipo: 'fatura' | 'prateleira') => void;
}

export function ScanScreen({
  onAbrirVinho,
  onEntradaManual,
  onAbrirPortfolio,
  onAbrirLote,
}: Props) {
  const user = useStore((s) => s.user);
  const wines = useStore((s) => s.wines);
  const addWine = useStore((s) => s.addWine);

  const [aAnalisar, setAAnalisar] = useState(false);
  const [resultado, setResultado] = useState<ScanResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recentes = wines.slice(0, 3);

  async function iniciarScan(origem: 'camara' | 'galeria') {
    setErro(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const base64 = await escolherImagem(origem);
    if (!base64) return;

    setAAnalisar(true);
    const r = await scanWineLabel(base64);
    setAAnalisar(false);

    if (!r.ok) {
      setErro(r.error);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResultado(r.data);
  }

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <Text style={estilos.titulo}>VinhaVibe</Text>
        <Text style={estilos.subtitulo}>
          {saudacao()}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.pergunta}>O que descobrimos hoje?</Text>

        <View style={estilos.scanCaixa}>
          <Pressable
            onPress={() => void iniciarScan('camara')}
            accessibilityRole="button"
            accessibilityLabel="Digitalizar etiqueta com a câmara"
            style={({ pressed }) => [estilos.scanBotao, pressed ? estilos.scanPremido : null]}
          >
            <Text style={estilos.scanEmoji}>📷</Text>
            <Text style={estilos.scanTexto}>SCAN</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => void iniciarScan('galeria')}
          accessibilityRole="button"
          style={estilos.galeria}
        >
          <Text style={estilos.galeriaTexto}>ou escolher da galeria</Text>
        </Pressable>

        {erro ? (
          <View style={estilos.erro} accessibilityLiveRegion="polite">
            <Text style={estilos.erroTexto}>{erro}</Text>
            <Pressable onPress={onEntradaManual} accessibilityRole="button">
              <Text style={estilos.erroAccao}>Adicionar manualmente →</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={estilos.grelha}>
          <Accao emoji="✍️" titulo="Manual" desc="Entrada à mão" onPress={onEntradaManual} />
          <Accao emoji="📊" titulo="Portfolio" desc="ROI da cave" onPress={onAbrirPortfolio} />
          <Accao emoji="🧾" titulo="Fatura" desc="Vários de uma vez" onPress={() => onAbrirLote('fatura')} />
          <Accao emoji="🗄️" titulo="Prateleira" desc="Digitaliza a cave" onPress={() => onAbrirLote('prateleira')} />
        </View>

        {recentes.length > 0 ? (
          <>
            <Text style={estilos.seccao}>Adicionados recentemente</Text>
            {recentes.map((w) => (
              <CartaoVinho key={w.id} wine={w} onPress={() => onAbrirVinho(w)} />
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Ecrã inteiro em vez de spinner discreto: a análise demora cerca de
          4,5 segundos, e sem isto a app parece encravada. */}
      <Modal visible={aAnalisar} transparent animationType="fade">
        <View style={estilos.overlay}>
          <ActivityIndicator size="large" color={Colors.gold.primary} />
          <Text style={estilos.overlayTitulo}>A identificar a etiqueta…</Text>
          <Text style={estilos.overlayTexto}>Costuma demorar uns segundos.</Text>
        </View>
      </Modal>

      <Modal
        visible={resultado !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setResultado(null)}
      >
        {resultado ? (
          <FolhaResultado
            inicial={resultado}
            onCancelar={() => setResultado(null)}
            onGuardar={async (r, quantidade, preco) => {
              if (!user) return false;
              const ok = await addWine(scanParaWine(r, user.id, quantidade, preco));
              if (ok) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setResultado(null);
              }
              return ok;
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}

/**
 * O resultado abre editável, nunca grava direto.
 *
 * A precisão do modelo em etiquetas reais ainda não está medida, e mesmo com
 * boa precisão haverá enganos. Mais vale o utilizador corrigir dois campos do
 * que descobrir semanas depois que a cave tem dados errados.
 */
function FolhaResultado({
  inicial,
  onCancelar,
  onGuardar,
}: {
  inicial: ScanResult;
  onCancelar: () => void;
  onGuardar: (r: ScanResult, quantidade: number, preco?: number) => Promise<boolean>;
}) {
  const [nome, setNome] = useState(inicial.name);
  const [produtor, setProdutor] = useState(inicial.producer);
  const [regiao, setRegiao] = useState(inicial.region);
  const [ano, setAno] = useState(inicial.vintage ? String(inicial.vintage) : '');
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const duvidoso = precisaConfirmacao(inicial);
  const pureza =
    inicial.is_natural || inicial.is_low_intervention || inicial.is_organic || inicial.is_biodynamic;

  async function guardar() {
    setAGuardar(true);
    const ok = await onGuardar(
      {
        ...inicial,
        name: nome.trim(),
        producer: produtor.trim(),
        region: regiao.trim(),
        vintage: ano.trim() ? Number(ano) : undefined,
      },
      Math.max(Number(quantidade) || 1, 1),
      preco.trim() ? Number(preco.replace(',', '.')) : undefined,
    );
    setAGuardar(false);
    return ok;
  }

  return (
    <View style={estilos.folhaFundo}>
      <Pressable style={estilos.folhaFora} onPress={onCancelar} accessibilityLabel="Fechar" />
      <View style={estilos.folha}>
        <View style={estilos.puxador} />

        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={estilos.folhaTopo}>
            <Text style={estilos.folhaEmoji}>{EMOJI_POR_TIPO[inicial.wine_type]}</Text>
            <View style={estilos.folhaInfo}>
              <Text style={estilos.folhaTitulo}>
                {duvidoso ? 'Confirma os dados' : 'Identificado'}
              </Text>
              <Text style={estilos.folhaConfianca}>
                Confiança {Math.round(inicial.confidence * 100)}%
              </Text>
            </View>
          </View>

          {duvidoso ? (
            <View style={estilos.aviso}>
              <Text style={estilos.avisoTexto}>
                A leitura não é de confiança suficiente. Verifica os campos antes de
                guardar.
              </Text>
            </View>
          ) : null}

          {pureza ? (
            <View style={estilos.selo}>
              <Text style={estilos.seloTexto}>
                🌿 A etiqueta indica produção
                {inicial.is_organic ? ' biológica' : ''}
                {inicial.is_biodynamic ? ' biodinâmica' : ''}
                {inicial.is_natural || inicial.is_low_intervention ? ' de baixa intervenção' : ''}
              </Text>
            </View>
          ) : null}

          <CampoTexto etiqueta="Nome" valor={nome} onChange={setNome} />
          <CampoTexto etiqueta="Produtor" valor={produtor} onChange={setProdutor} />
          <CampoTexto etiqueta="Região" valor={regiao} onChange={setRegiao} />

          <View style={estilos.linha}>
            <View style={estilos.meia}>
              <CampoTexto etiqueta="Ano" valor={ano} onChange={setAno} />
            </View>
            <View style={estilos.meia}>
              <CampoTexto etiqueta="Garrafas" valor={quantidade} onChange={setQuantidade} />
            </View>
          </View>

          <CampoTexto
            etiqueta="Preço por garrafa (€)"
            valor={preco}
            onChange={setPreco}
            placeholder="opcional"
          />

          {inicial.grape_varieties.length > 0 ? (
            <Text style={estilos.detectado}>
              Castas detectadas: {inicial.grape_varieties.join(', ')}
            </Text>
          ) : null}

          <Botao titulo="Adicionar à cave" onPress={() => void guardar()} ocupado={aGuardar} />
          <Pressable onPress={onCancelar} style={estilos.cancelar} accessibilityRole="button">
            <Text style={estilos.cancelarTexto}>Cancelar</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

function Accao({
  emoji,
  titulo,
  desc,
  onPress,
  desactivado = false,
}: {
  emoji: string;
  titulo: string;
  desc: string;
  onPress?: () => void;
  desactivado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactivado}
      accessibilityRole="button"
      accessibilityState={{ disabled: desactivado }}
      style={[estilos.accao, desactivado ? estilos.accaoInerte : null]}
    >
      <Text style={estilos.accaoEmoji}>{emoji}</Text>
      <Text style={estilos.accaoTitulo}>{titulo}</Text>
      <Text style={estilos.accaoDesc}>{desc}</Text>
    </Pressable>
  );
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: { backgroundColor: Colors.burgundy.primary, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl },
  titulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['3xl'], color: Colors.cream.white, letterSpacing: 1 },
  subtitulo: { fontFamily: Typography.fonts.sansLight, fontSize: Typography.sizes.sm, color: Colors.gold.light, marginTop: 2 },
  conteudo: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  pergunta: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.xl, color: Colors.text.primary, textAlign: 'center', marginTop: Spacing.md },
  scanCaixa: { alignItems: 'center', marginVertical: Spacing['4xl'] },
  scanBotao: {
    width: 128, height: 128, borderRadius: 64, backgroundColor: Colors.burgundy.primary,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, ...Shadow.md,
  },
  scanPremido: { opacity: 0.9, transform: [{ scale: 0.96 }] },
  scanEmoji: { fontSize: 38 },
  scanTexto: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.sm, color: Colors.cream.white, letterSpacing: 1.5 },
  galeria: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  galeriaTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.burgundy.mid },
  erro: { backgroundColor: Colors.status.dangerBg, borderRadius: Radius.md, padding: Spacing.xl, marginBottom: Spacing.xl, gap: Spacing.md },
  erroTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.status.dangerText, lineHeight: 20 },
  erroAccao: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.status.dangerText },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  accao: { flexBasis: '47%', flexGrow: 1, backgroundColor: Colors.cream.light, borderRadius: Radius.lg, padding: Spacing.xl },
  accaoInerte: { opacity: 0.45 },
  accaoEmoji: { fontSize: 22, marginBottom: Spacing.xs },
  accaoTitulo: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  accaoDesc: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 1 },
  seccao: {
    fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.xs, color: Colors.text.muted,
    textTransform: 'uppercase', letterSpacing: 0.7, marginTop: Spacing['3xl'], marginBottom: Spacing.md,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(10,2,2,0.86)', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  overlayTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['2xl'], color: Colors.cream.white },
  overlayTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.cream.mid },
  folhaFundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,2,2,0.5)' },
  folhaFora: { flex: 1 },
  folha: {
    backgroundColor: Colors.cream.white, borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'], padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing['4xl'] : Spacing.xl, maxHeight: '88%',
  },
  puxador: { width: 34, height: 4, borderRadius: 2, backgroundColor: Colors.cream.dark, alignSelf: 'center', marginBottom: Spacing.xl },
  folhaTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.xl },
  folhaEmoji: { fontSize: 34 },
  folhaInfo: { flex: 1 },
  folhaTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['2xl'], color: Colors.burgundy.primary },
  folhaConfianca: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  aviso: { backgroundColor: Colors.status.warningBg, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  avisoTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.status.warningText, lineHeight: 19 },
  selo: { backgroundColor: Colors.pureza.bg, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  seloTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.pureza.text },
  linha: { flexDirection: 'row', gap: Spacing.lg },
  meia: { flex: 1 },
  detectado: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginBottom: Spacing.xl },
  cancelar: { alignItems: 'center', paddingVertical: Spacing.xl },
  cancelarTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.muted },
});
