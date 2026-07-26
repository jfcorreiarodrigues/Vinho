import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/theme';

type Variante = 'primario' | 'dourado' | 'fantasma';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  ocupado?: boolean;
  desactivado?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  ocupado = false,
  desactivado = false,
  style,
  accessibilityLabel,
}: Props) {
  const inerte = desactivado || ocupado;

  function premir() {
    // Haptics em acções importantes (secção 15).
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Pressable
      onPress={premir}
      disabled={inerte}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inerte, busy: ocupado }}
      style={({ pressed }) => [
        estilos.base,
        estilos[variante],
        pressed && !inerte ? estilos.premido : null,
        inerte ? estilos.inerte : null,
        style,
      ]}
    >
      {ocupado ? (
        <ActivityIndicator color={corDoTexto(variante)} />
      ) : (
        <Text style={[estilos.texto, { color: corDoTexto(variante) }]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

function corDoTexto(v: Variante): string {
  if (v === 'dourado') return Colors.burgundy.primary;
  if (v === 'fantasma') return Colors.cream.light;
  return Colors.cream.white;
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // alvo de toque confortável
  },
  primario: { backgroundColor: Colors.burgundy.primary },
  dourado: { backgroundColor: Colors.gold.primary },
  fantasma: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(245,239,224,0.35)',
  },
  premido: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  inerte: { opacity: 0.5 },
  texto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    letterSpacing: 0.3,
  },
});
