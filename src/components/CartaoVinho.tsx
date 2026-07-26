import { Pressable, StyleSheet, Text, View } from 'react-native';

import { euros } from '@/lib/formato';
import { ehPureza, estaNoPico, jaPassouDoPico } from '@/store/selectors';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { Wine, WineType } from '@/types';

/** Emoji por tipo de vinho, à semelhança do preview. */
export const EMOJI_POR_TIPO: Record<WineType, string> = {
  tinto: '🍷',
  branco: '🥂',
  rose: '🌸',
  espumante: '🍾',
  fortificado: '🥃',
};

interface Props {
  wine: Wine;
  onPress: () => void;
}

export function CartaoVinho({ wine, onPress }: Props) {
  const noPico = estaNoPico(wine);
  const passou = jaPassouDoPico(wine);
  const preco = wine.current_market_value ?? wine.purchase_price;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${wine.name}, ${wine.producer}, ${wine.quantity} garrafas`}
      style={({ pressed }) => [estilos.cartao, pressed ? estilos.premido : null]}
    >
      <View style={estilos.icone}>
        <Text style={estilos.iconeTexto}>{EMOJI_POR_TIPO[wine.wine_type]}</Text>
      </View>

      <View style={estilos.info}>
        <Text style={estilos.nome} numberOfLines={1}>
          {wine.name}
        </Text>
        <Text style={estilos.meta} numberOfLines={1}>
          {[wine.region, wine.grape_varieties[0]].filter(Boolean).join(' · ')}
        </Text>

        <View style={estilos.etiquetas}>
          {ehPureza(wine) ? (
            <Etiqueta texto="🌿 Pureza" fundo={Colors.pureza.bg} cor={Colors.pureza.text} />
          ) : null}
          {passou ? (
            <Etiqueta
              texto="⚠️ Beber já"
              fundo={Colors.status.dangerBg}
              cor={Colors.status.dangerText}
            />
          ) : noPico ? (
            <Etiqueta texto="⭐ No pico" fundo={Colors.gold.pale} cor={Colors.gold.deep} />
          ) : null}
          {(wine.rarity_score ?? 0) >= 70 ? (
            <Etiqueta texto="Raro" fundo={Colors.cream.light} cor={Colors.text.secondary} />
          ) : null}
        </View>
      </View>

      <View style={estilos.direita}>
        {wine.vintage ? <Text style={estilos.ano}>{wine.vintage}</Text> : null}
        {preco != null ? <Text style={estilos.preco}>{euros(preco)}</Text> : null}
        <Text style={estilos.quantidade}>×{wine.quantity}</Text>
      </View>
    </Pressable>
  );
}

function Etiqueta({ texto, fundo, cor }: { texto: string; fundo: string; cor: string }) {
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fundo }]}>
      <Text style={[estilos.etiquetaTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    backgroundColor: Colors.cream.white,
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  premido: { borderColor: Colors.burgundy.light, opacity: 0.9 },
  icone: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.burgundy.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeTexto: { fontSize: 22 },
  info: { flex: 1, minWidth: 0 },
  nome: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  meta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
    marginTop: 1,
  },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  etiqueta: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  etiquetaTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs },
  direita: { alignItems: 'flex-end' },
  ano: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.burgundy.primary,
  },
  preco: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  quantidade: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
});
