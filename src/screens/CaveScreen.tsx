import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartaoVinho } from '@/components/CartaoVinho';
import { euros, percentagem } from '@/lib/formato';
import { useStore } from '@/store';
import { saiDoPicoEsteAno } from '@/store/selectors';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/theme';
import type { Wine, WineFilter } from '@/types';

const FILTROS: { chave: WineFilter; texto: string }[] = [
  { chave: 'todos', texto: 'Todos' },
  { chave: 'tintos', texto: 'Tintos' },
  { chave: 'brancos', texto: 'Brancos' },
  { chave: 'roses', texto: 'Rosés' },
  { chave: 'espumantes', texto: 'Espumantes' },
  { chave: 'naturais', texto: '🌿 Naturais' },
  { chave: 'beber_agora', texto: 'Beber agora' },
  { chave: 'investimento', texto: '💰 Invest.' },
];

interface Props {
  onAbrirVinho: (wine: Wine) => void;
  onAdicionar: () => void;
}

export function CaveScreen({ onAbrirVinho, onAdicionar }: Props) {
  const [filtro, setFiltro] = useState<WineFilter>('todos');

  const wines = useStore((s) => s.wines);
  const isLoading = useStore((s) => s.isLoading);
  const erro = useStore((s) => s.error);
  const fetchWines = useStore((s) => s.fetchWines);
  const getCellarStats = useStore((s) => s.getCellarStats);
  const getFilteredWines = useStore((s) => s.getFilteredWines);

  useEffect(() => {
    void fetchWines();
  }, [fetchWines]);

  const stats = getCellarStats();
  const visiveis = getFilteredWines(filtro);

  const aSairDoPico = useMemo(
    () => wines.filter((w) => saiDoPicoEsteAno(w)).length,
    [wines],
  );

  const caveVazia = wines.length === 0;

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <Text style={estilos.titulo}>A Minha Cave</Text>
        <Text style={estilos.subtitulo}>
          {stats.total_bottles === 1
            ? '1 garrafa · Lisboa'
            : `${stats.total_bottles} garrafas · Lisboa`}
        </Text>
      </SafeAreaView>

      {aSairDoPico > 0 ? (
        <View style={estilos.aviso}>
          <Text style={estilos.avisoTexto}>
            ⚠️ {aSairDoPico === 1 ? '1 vinho sai' : `${aSairDoPico} vinhos saem`} do pico este
            ano — altura de abrir
          </Text>
        </View>
      ) : null}

      <View style={estilos.stats}>
        <Estatistica valor={String(stats.total_bottles)} etiqueta="Garrafas" />
        <Estatistica
          valor={euros(stats.current_market_value)}
          etiqueta="Valor"
        />
        <Estatistica
          valor={percentagem(stats.roi_pct)}
          etiqueta="ROI"
          tom={stats.roi_pct >= 0 ? 'positivo' : 'negativo'}
        />
        <Estatistica valor={String(stats.wines_at_peak)} etiqueta="No pico" tom="destaque" />
      </View>

      <View style={estilos.filtrosCaixa}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtros}
        >
          {FILTROS.map((f) => {
            const activo = f.chave === filtro;
            return (
              <Pressable
                key={f.chave}
                onPress={() => setFiltro(f.chave)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                style={[estilos.filtro, activo ? estilos.filtroActivo : null]}
              >
                <Text style={[estilos.filtroTexto, activo ? estilos.filtroTextoActivo : null]}>
                  {f.texto}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {erro ? (
        <View style={estilos.erro}>
          <Text style={estilos.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      {isLoading && caveVazia ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={Colors.burgundy.primary} />
        </View>
      ) : (
        <FlatList
          data={visiveis}
          keyExtractor={(w) => w.id}
          contentContainerStyle={estilos.lista}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && !caveVazia}
              onRefresh={() => void fetchWines()}
              tintColor={Colors.burgundy.primary}
            />
          }
          renderItem={({ item }) => (
            <CartaoVinho wine={item} onPress={() => onAbrirVinho(item)} />
          )}
          ListEmptyComponent={
            <Vazio
              caveVazia={caveVazia}
              filtro={FILTROS.find((f) => f.chave === filtro)?.texto ?? ''}
              onAdicionar={onAdicionar}
            />
          }
        />
      )}

      <Pressable
        onPress={onAdicionar}
        accessibilityRole="button"
        accessibilityLabel="Adicionar vinho à cave"
        style={({ pressed }) => [estilos.fab, pressed ? estilos.fabPremido : null]}
      >
        <Text style={estilos.fabTexto}>+</Text>
      </Pressable>
    </View>
  );
}

function Estatistica({
  valor,
  etiqueta,
  tom = 'normal',
}: {
  valor: string;
  etiqueta: string;
  tom?: 'normal' | 'positivo' | 'negativo' | 'destaque';
}) {
  const destaque = tom === 'destaque';
  return (
    <View style={[estilos.stat, destaque ? estilos.statDestaque : null]}>
      <Text
        style={[
          estilos.statValor,
          tom === 'positivo' ? { color: Colors.pureza.text } : null,
          tom === 'negativo' ? { color: Colors.status.dangerText } : null,
          destaque ? { color: Colors.gold.light } : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valor}
      </Text>
      <Text style={[estilos.statEtiqueta, destaque ? { color: Colors.cream.mid } : null]}>
        {etiqueta}
      </Text>
    </View>
  );
}

function Vazio({
  caveVazia,
  filtro,
  onAdicionar,
}: {
  caveVazia: boolean;
  filtro: string;
  onAdicionar: () => void;
}) {
  return (
    <View style={estilos.vazio}>
      <Text style={estilos.vazioEmoji}>{caveVazia ? '🍷' : '🔍'}</Text>
      <Text style={estilos.vazioTitulo}>
        {caveVazia ? 'A tua cave está vazia' : 'Nada neste filtro'}
      </Text>
      <Text style={estilos.vazioTexto}>
        {caveVazia
          ? 'Adiciona a primeira garrafa e começa a acompanhar a maturação e o valor da tua colecção.'
          : `Não há vinhos em "${filtro}". Experimenta outro filtro.`}
      </Text>
      {caveVazia ? (
        <Pressable onPress={onAdicionar} style={estilos.vazioBotao} accessibilityRole="button">
          <Text style={estilos.vazioBotaoTexto}>Adicionar vinho</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: {
    backgroundColor: Colors.burgundy.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  titulo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.cream.white,
  },
  subtitulo: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.sm,
    color: Colors.gold.light,
    marginTop: 2,
  },
  aviso: { backgroundColor: Colors.status.warningBg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  avisoTexto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.status.warningText,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream.mid,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.cream.light,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  statDestaque: { backgroundColor: Colors.burgundy.primary },
  statValor: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.burgundy.primary,
  },
  statEtiqueta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    marginTop: 1,
  },
  filtrosCaixa: { borderBottomWidth: 1, borderBottomColor: Colors.cream.mid },
  filtros: { gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  filtro: {
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  filtroActivo: { backgroundColor: Colors.burgundy.primary, borderColor: Colors.burgundy.primary },
  filtroTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  filtroTextoActivo: { color: Colors.cream.white },
  erro: { backgroundColor: Colors.status.dangerBg, padding: Spacing.lg },
  erroTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.status.dangerText,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: Spacing.lg, paddingBottom: 96, flexGrow: 1 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'], gap: Spacing.md },
  vazioEmoji: { fontSize: 44 },
  vazioTitulo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.burgundy.primary,
  },
  vazioTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  vazioBotao: {
    marginTop: Spacing.md,
    backgroundColor: Colors.burgundy.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
  },
  vazioBotaoTexto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.cream.white,
  },
  fab: {
    position: 'absolute',
    right: Spacing['2xl'],
    bottom: Spacing['2xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.burgundy.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fabPremido: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  fabTexto: { fontSize: 30, color: Colors.cream.white, lineHeight: 34 },
});
