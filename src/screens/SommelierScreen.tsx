import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SUGESTOES,
  criarMensagem,
  mensagemInicial,
} from '@/lib/sommelier';
import { perguntarAoSommelier } from '@/lib/sommelierApi';
import { useStore } from '@/store';
import { estaNoPico } from '@/store/selectors';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { Message } from '@/types';

export function SommelierScreen() {
  const wines = useStore((s) => s.wines);
  const weather = useStore((s) => s.weather);
  const user = useStore((s) => s.user);
  const mensagens = useStore((s) => s.sommelierMessages);
  const addMensagem = useStore((s) => s.addSommelierMessage);
  const fetchWeather = useStore((s) => s.fetchWeather);

  const [texto, setTexto] = useState('');
  const [aPensar, setAPensar] = useState(false);
  const listaRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    void fetchWeather();
  }, [fetchWeather]);

  // A primeira mensagem contextualiza com a cave e a hora. Só entra uma vez.
  useEffect(() => {
    if (mensagens.length === 0) {
      addMensagem(criarMensagem('sommelier', mensagemInicial(wines, weather)));
    }
    // Depende só do arranque: reagir a `wines` reinjectaria a saudação sempre
    // que a cave mudasse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noPico = wines.filter((w) => estaNoPico(w)).length;

  async function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || aPensar) return;

    setTexto('');
    const historico = [...mensagens];
    addMensagem(criarMensagem('user', limpa));
    setAPensar(true);

    const r = await perguntarAoSommelier(limpa, historico, wines, weather);
    setAPensar(false);

    addMensagem(
      criarMensagem('sommelier', r.ok ? r.data : r.error),
    );
    setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 80);
  }

  return (
    <KeyboardAvoidingView
      style={estilos.fundo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Sommelier</Text>
        <Text style={estilos.subtitulo}>
          {weather ? `${Math.round(weather.temp_c)}°C em Lisboa · ` : ''}
          {wines.length === 0
            ? 'cave vazia'
            : `${wines.length} vinhos${noPico > 0 ? ` · ${noPico} no pico` : ''}`}
        </Text>
      </SafeAreaView>

      <FlatList
        ref={listaRef}
        data={mensagens}
        style={estilos.conversaLista}
        keyExtractor={(m) => m.id}
        contentContainerStyle={estilos.conversa}
        renderItem={({ item }) => <Balao mensagem={item} inicial={user?.name?.charAt(0) ?? 'E'} />}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          aPensar ? (
            <View style={[estilos.balao, estilos.balaoSommelier, estilos.aPensar]}>
              <ActivityIndicator size="small" color={Colors.burgundy.primary} />
              <Text style={estilos.aPensarTexto}>a pensar…</Text>
            </View>
          ) : null
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={estilos.sugestoesCaixa}
        contentContainerStyle={estilos.sugestoes}
      >
        {SUGESTOES.map((s) => (
          <Pressable
            key={s}
            onPress={() => void enviar(s)}
            disabled={aPensar}
            accessibilityRole="button"
            style={[estilos.sugestao, aPensar ? estilos.sugestaoInerte : null]}
          >
            <Text style={estilos.sugestaoTexto}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={estilos.barra}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Pergunta ao sommelier…"
          placeholderTextColor={Colors.text.muted}
          style={estilos.campo}
          onSubmitEditing={() => void enviar(texto)}
          returnKeyType="send"
          accessibilityLabel="Mensagem para o sommelier"
          editable={!aPensar}
        />
        <Pressable
          onPress={() => void enviar(texto)}
          disabled={aPensar || texto.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          style={[
            estilos.enviar,
            aPensar || texto.trim().length === 0 ? estilos.enviarInerte : null,
          ]}
        >
          <Text style={estilos.enviarTexto}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Balao({ mensagem, inicial }: { mensagem: Message; inicial: string }) {
  const doUtilizador = mensagem.role === 'user';
  return (
    <View style={[estilos.linha, doUtilizador ? estilos.linhaDireita : null]}>
      {!doUtilizador ? (
        <View style={estilos.avatar}>
          <Text style={estilos.avatarEmoji}>🧑‍🍳</Text>
        </View>
      ) : null}
      <View
        style={[estilos.balao, doUtilizador ? estilos.balaoUser : estilos.balaoSommelier]}
      >
        <Text style={doUtilizador ? estilos.textoUser : estilos.textoSommelier}>
          {mensagem.content}
        </Text>
      </View>
      {doUtilizador ? (
        <View style={[estilos.avatar, estilos.avatarUser]}>
          <Text style={estilos.avatarInicial}>{inicial.toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: { backgroundColor: Colors.burgundy.primary, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl },
  titulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes['3xl'], color: Colors.cream.white },
  subtitulo: { fontFamily: Typography.fonts.sansLight, fontSize: Typography.sizes.sm, color: Colors.gold.light, marginTop: 2 },
  conversaLista: { flex: 1 },
  conversa: { padding: Spacing.xl, gap: Spacing.lg },
  linha: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-end' },
  linhaDireita: { justifyContent: 'flex-end' },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.cream.light,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarUser: { backgroundColor: Colors.burgundy.primary },
  avatarEmoji: { fontSize: 15 },
  avatarInicial: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.sm, color: Colors.cream.white },
  balao: { maxWidth: '76%', borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  balaoSommelier: { backgroundColor: Colors.cream.light, borderBottomLeftRadius: Radius.sm },
  balaoUser: { backgroundColor: Colors.burgundy.primary, borderBottomRightRadius: Radius.sm },
  textoSommelier: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.primary, lineHeight: 21 },
  textoUser: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.cream.white, lineHeight: 21 },
  aPensar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, alignSelf: 'flex-start', marginLeft: 40 },
  aPensarTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  // `flexGrow: 0` impede a barra de sugestões de crescer para o espaço livre;
  // sem isso os chips esticam no eixo vertical e, com raio 999, viram elipses.
  sugestoesCaixa: { flexGrow: 0, flexShrink: 0 },
  sugestoes: {
    gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  sugestao: {
    borderWidth: 1, borderColor: Colors.cream.mid, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  sugestaoInerte: { opacity: 0.45 },
  sugestaoTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.burgundy.mid },
  barra: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'center',
    padding: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.cream.mid,
  },
  campo: {
    flex: 1, backgroundColor: Colors.cream.light, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base,
    color: Colors.text.primary, minHeight: 44,
  },
  enviar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.burgundy.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  enviarInerte: { opacity: 0.4 },
  enviarTexto: { fontSize: 20, color: Colors.cream.white, lineHeight: 24 },
});
