import { Platform, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/theme';

/**
 * Mostrado quando `EXPO_PUBLIC_SUPABASE_URL` ou `EXPO_PUBLIC_SUPABASE_ANON_KEY`
 * não chegaram ao bundle.
 *
 * Estas variáveis são resolvidas em build time, não em runtime: definir-las
 * depois de publicar não muda nada, é preciso voltar a construir. É a parte
 * que menos se adivinha sozinha, por isso está escrita.
 */
export function ConfiguracaoEmFaltaScreen() {
  const naWeb = Platform.OS === 'web';

  return (
    <View style={estilos.fundo}>
      <View style={estilos.caixa}>
        <Text style={estilos.emoji}>🔌</Text>
        <Text style={estilos.titulo}>Falta configurar o Supabase</Text>
        <Text style={estilos.texto}>
          A app foi construída sem as variáveis de ambiente, por isso não
          consegue falar com a base de dados.
        </Text>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>EXPO_PUBLIC_SUPABASE_URL</Text>
          <Text style={estilos.rotulo}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
        </View>

        <Text style={estilos.texto}>
          {naWeb
            ? 'Define-as no projeto do Vercel (Settings → Environment Variables) e faz Redeploy.'
            : 'Copia .env.example para .env, preenche os valores e arranca outra vez.'}
        </Text>

        <Text style={estilos.nota}>
          São lidas durante o build. Defini-las depois de publicar não chega —
          é preciso construir de novo.
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.burgundy.primary,
  },
  caixa: {
    maxWidth: 420,
    width: '100%',
    gap: Spacing.lg,
    padding: Spacing['2xl'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.cream.white,
  },
  emoji: { fontSize: 36 },
  titulo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.burgundy.primary,
  },
  texto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    lineHeight: 21,
  },
  bloco: {
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cream.light,
  },
  rotulo: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: Typography.sizes.sm,
    color: Colors.burgundy.mid,
  },
  nota: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
    lineHeight: 19,
  },
});
