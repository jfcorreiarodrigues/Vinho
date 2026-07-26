import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { euros, percentagem } from '@/lib/formato';
import { useStore } from '@/store';
import { Colors, Radius, Spacing, Typography } from '@/theme';

interface Props {
  onAbrirPortfolio: () => void;
}

export function ProfileScreen({ onAbrirPortfolio }: Props) {
  const user = useStore((s) => s.user);
  const terminarSessao = useStore((s) => s.terminarSessao);
  const getCellarStats = useStore((s) => s.getCellarStats);
  const stats = getCellarStats();

  // Preferências locais até o passo 14 as ligar a `user_settings`.
  const [naturais, setNaturais] = useState(true);
  const [alertasPico, setAlertasPico] = useState(true);
  const [digest, setDigest] = useState(false);

  const premium = user?.plan === 'premium';

  function confirmarSaida() {
    Alert.alert('Terminar sessão?', 'Vais precisar de entrar outra vez.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar sessão', style: 'destructive', onPress: () => void terminarSessao() },
    ]);
  }

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>
            {(user?.name ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={estilos.nome}>{user?.name ?? 'Enófilo'}</Text>
        <View style={estilos.plano}>
          <Text style={estilos.planoTexto}>
            {premium ? '★ Premium' : 'Plano gratuito'}
          </Text>
        </View>

        <View style={estilos.stats}>
          <Stat valor={String(stats.total_bottles)} etiqueta="Garrafas" />
          <Stat valor={euros(stats.total_invested)} etiqueta="Investido" />
          <Stat valor={percentagem(stats.roi_pct, 0)} etiqueta="ROI" />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={estilos.conteudo}>
        {!premium ? (
          <View style={estilos.upgrade}>
            <Text style={estilos.upgradeTitulo}>VinhaVibe Premium</Text>
            <Text style={estilos.upgradeTexto}>
              Garrafas ilimitadas, gráficos de evolução, alertas de preço em
              tempo real e digest semanal.
            </Text>
            <View style={estilos.upgradeBotao}>
              <Text style={estilos.upgradeBotaoTexto}>
                9,90€/mês — disponível em breve
              </Text>
            </View>
            <Text style={estilos.upgradeNota}>
              Os pagamentos activam-se quando a integração Stripe estiver
              concluída.
            </Text>
          </View>
        ) : null}

        <Text style={estilos.seccao}>Cave</Text>
        <Linha
          emoji="📊"
          texto="Portfolio de investimento"
          detalhe={`${stats.total_bottles} garrafas`}
          onPress={onAbrirPortfolio}
        />

        <Text style={estilos.seccao}>Preferências</Text>
        <Toggle
          emoji="🌿"
          texto="Destacar vinhos naturais"
          valor={naturais}
          onChange={setNaturais}
        />
        <Toggle
          emoji="⭐"
          texto="Alertas de pico de maturação"
          valor={alertasPico}
          onChange={setAlertasPico}
        />
        <Toggle
          emoji="📧"
          texto="Digest semanal"
          valor={digest}
          onChange={setDigest}
        />
        <Text style={estilos.nota}>
          As preferências ficam neste dispositivo até à sincronização com o
          perfil (passo 14).
        </Text>

        <Text style={estilos.seccao}>Conta</Text>
        <Linha emoji="✉️" texto="Email" detalhe={user?.email ?? '—'} />
        <Linha emoji="📍" texto="Localização" detalhe={user?.location ?? 'Lisboa'} />

        <Text style={estilos.seccao}>Sobre</Text>
        <Linha emoji="ℹ️" texto="Versão" detalhe="1.0.0" />

        <Pressable onPress={confirmarSaida} style={estilos.sair} accessibilityRole="button">
          <Text style={estilos.sairTexto}>Terminar sessão</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={estilos.stat}>
      <Text style={estilos.statValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={estilos.statEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Linha({
  emoji,
  texto,
  detalhe,
  onPress,
}: {
  emoji: string;
  texto: string;
  detalhe?: string;
  onPress?: () => void;
}) {
  const conteudo = (
    <>
      <Text style={estilos.linhaEmoji}>{emoji}</Text>
      <Text style={estilos.linhaTexto}>{texto}</Text>
      {detalhe ? (
        <Text style={estilos.linhaDetalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      ) : null}
      {onPress ? <Text style={estilos.seta}>›</Text> : null}
    </>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={estilos.linha} accessibilityRole="button">
      {conteudo}
    </Pressable>
  ) : (
    <View style={estilos.linha}>{conteudo}</View>
  );
}

function Toggle({
  emoji,
  texto,
  valor,
  onChange,
}: {
  emoji: string;
  texto: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.linhaEmoji}>{emoji}</Text>
      <Text style={estilos.linhaTexto}>{texto}</Text>
      <Switch
        value={valor}
        onValueChange={onChange}
        accessibilityLabel={texto}
        trackColor={{ true: Colors.burgundy.light, false: Colors.cream.dark }}
        thumbColor={valor ? Colors.burgundy.primary : Colors.cream.white}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: {
    backgroundColor: Colors.burgundy.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.gold.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarTexto: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['3xl'], color: Colors.burgundy.primary },
  nome: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['3xl'], color: Colors.cream.white, marginTop: Spacing.md },
  plano: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xs, marginTop: Spacing.sm },
  planoTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.gold.light },
  stats: { flexDirection: 'row', gap: Spacing['3xl'], marginTop: Spacing.xl },
  stat: { alignItems: 'center', minWidth: 72 },
  statValor: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.cream.white },
  statEtiqueta: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs, color: Colors.cream.mid },
  conteudo: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  upgrade: { backgroundColor: Colors.burgundy.primary, borderRadius: Radius.lg, padding: Spacing.xl },
  upgradeTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['2xl'], color: Colors.cream.white },
  upgradeTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.cream.mid, marginTop: Spacing.sm, lineHeight: 19 },
  upgradeBotao: { backgroundColor: Colors.gold.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl, opacity: 0.75 },
  upgradeBotaoTexto: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.burgundy.primary },
  upgradeNota: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs, color: Colors.gold.light, marginTop: Spacing.md, textAlign: 'center' },
  seccao: {
    fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.xs,
    color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.7,
    marginTop: Spacing['3xl'], marginBottom: Spacing.md,
  },
  linha: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.cream.light, borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, marginBottom: Spacing.sm,
    minHeight: 52,
  },
  linhaEmoji: { fontSize: 17 },
  linhaTexto: { flex: 1, fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.primary },
  linhaDetalhe: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, maxWidth: 160 },
  seta: { fontSize: Typography.sizes.xl, color: Colors.text.muted },
  nota: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.xs, color: Colors.text.muted, marginTop: Spacing.sm, lineHeight: 16 },
  sair: {
    marginTop: Spacing['4xl'], borderWidth: 1, borderColor: Colors.status.dangerText,
    borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center',
  },
  sairTexto: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.status.dangerText },
});
