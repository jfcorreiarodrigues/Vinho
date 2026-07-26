import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/theme';

interface Props {
  titulo: string;
  subtitulo: string;
  emoji: string;
  passo: string;
}

/**
 * Placeholder dos separadores ainda por implementar. Substituído pelo ecrã
 * real no passo correspondente da secção 16.
 */
export function EmConstrucao({ titulo, subtitulo, emoji, passo }: Props) {
  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <Text style={estilos.tituloCabecalho}>{titulo}</Text>
        <Text style={estilos.subtituloCabecalho}>{subtitulo}</Text>
      </SafeAreaView>

      <View style={estilos.centro}>
        <Text style={estilos.emoji}>{emoji}</Text>
        <Text style={estilos.aviso}>Em construção</Text>
        <Text style={estilos.passo}>{passo}</Text>
      </View>
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
  tituloCabecalho: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.cream.white,
  },
  subtituloCabecalho: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.sm,
    color: Colors.gold.light,
    marginTop: 2,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emoji: { fontSize: 48 },
  aviso: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.burgundy.primary,
  },
  passo: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
});
