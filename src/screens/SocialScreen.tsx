import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { alternarLike, fetchFeed } from '@/lib/supabase';
import { useStore } from '@/store';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { Challenge, WinePost } from '@/types';

type Aba = 'feed' | 'descobrir' | 'desafios';

/** Desafios base da secção 10.10. Estáticos até haver motor de desafios. */
const DESAFIOS: Challenge[] = [
  {
    id: 'castas',
    emoji: '🍇',
    title: 'Explorador de Castas',
    description: 'Prova 5 castas autóctones portuguesas.',
    progress: 0,
    target: 5,
    reward: 'Badge Explorador',
    expires_at: '',
    premium_only: false,
  },
  {
    id: 'regioes',
    emoji: '🗺️',
    title: 'Regiões de Portugal',
    description: 'Um vinho de cada região vitivinícola.',
    progress: 0,
    target: 9,
    reward: 'Badge Cartógrafo',
    expires_at: '',
    premium_only: false,
  },
  {
    id: 'natural',
    emoji: '🌿',
    title: 'Natural & Puro',
    description: '3 vinhos com selo Pureza esta semana.',
    progress: 0,
    target: 3,
    reward: '1 mês de Premium',
    expires_at: '',
    premium_only: false,
  },
];

/** Produtores reais, curados. Não depende de haver comunidade. */
const PRODUTORES = [
  { nome: 'Niepoort', regiao: 'Douro', nota: 'Dirk Niepoort, referência dos tintos de mesa do Douro' },
  { nome: 'Anselmo Mendes', regiao: 'Vinho Verde', nota: 'O nome que reinventou o Alvarinho' },
  { nome: 'Luis Pato', regiao: 'Bairrada', nota: 'Baga levada a sério há quatro décadas' },
  { nome: 'Soalheiro', regiao: 'Melgaço', nota: 'Alvarinho de vinha própria, produção biológica' },
  { nome: 'Quinta do Mouro', regiao: 'Alentejo', nota: 'Alentejo sem excessos, longevidade rara' },
];

export function SocialScreen() {
  const [aba, setAba] = useState<Aba>('feed');
  const [posts, setPosts] = useState<WinePost[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const wines = useStore((s) => s.wines);

  const carregar = useCallback(async () => {
    setACarregar(true);
    const r = await fetchFeed();
    if (r.ok) {
      setPosts(r.data);
      setErro(null);
    } else {
      setErro(r.error);
    }
    setACarregar(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gostar(post: WinePost) {
    // Optimista: o coração responde já e reverte se o servidor recusar.
    setPosts((atuais) =>
      atuais.map((p) =>
        p.id === post.id
          ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
          : p,
      ),
    );
    const r = await alternarLike(post.id, post.liked);
    if (!r.ok) {
      setPosts((atuais) =>
        atuais.map((p) =>
          p.id === post.id
            ? { ...p, liked: post.liked, likes: post.likes }
            : p,
        ),
      );
      setErro(r.error);
    }
  }

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <Text style={estilos.titulo}>VinhaFeed</Text>
        <Text style={estilos.subtitulo}>Rede de amantes de vinho</Text>
      </SafeAreaView>

      <View style={estilos.abas}>
        {(
          [
            ['feed', '📰 Feed'],
            ['descobrir', '🔍 Descobrir'],
            ['desafios', '🏆 Desafios'],
          ] as [Aba, string][]
        ).map(([chave, texto]) => (
          <Pressable
            key={chave}
            onPress={() => setAba(chave)}
            accessibilityRole="button"
            accessibilityState={{ selected: chave === aba }}
            style={[estilos.aba, chave === aba ? estilos.abaActiva : null]}
          >
            <Text style={[estilos.abaTexto, chave === aba ? estilos.abaTextoActivo : null]}>
              {texto}
            </Text>
          </Pressable>
        ))}
      </View>

      {erro ? (
        <View style={estilos.erro}>
          <Text style={estilos.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      {aba === 'feed' ? (
        aCarregar ? (
          <View style={estilos.centro}>
            <ActivityIndicator color={Colors.burgundy.primary} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={estilos.lista}
            renderItem={({ item }) => <Post post={item} onGostar={() => void gostar(item)} />}
            ListEmptyComponent={<FeedVazio temVinhos={wines.length > 0} />}
          />
        )
      ) : aba === 'descobrir' ? (
        <Descobrir />
      ) : (
        <Desafios wines={wines.length} />
      )}
    </View>
  );
}

function Post({ post, onGostar }: { post: WinePost; onGostar: () => void }) {
  return (
    <View style={estilos.post}>
      <View style={estilos.postTopo}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{post.user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={estilos.postAutor}>
          <Text style={estilos.postNome}>
            {post.user.name} · {post.user.location}
          </Text>
          <Text style={estilos.postTempo}>{haQuanto(post.timestamp)}</Text>
        </View>
      </View>

      <View style={estilos.postVinho}>
        <Text style={estilos.postVinhoEmoji}>🍷</Text>
        <View style={estilos.postVinhoInfo}>
          <Text style={estilos.postVinhoNome}>
            {post.wine_name}
            {post.vintage ? ` ${post.vintage}` : ''}
          </Text>
          <Text style={estilos.postVinhoMeta}>
            {[post.producer, post.region, post.is_pureza ? '🌿 Pureza' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <View style={estilos.estrelas}>
          <Text style={estilos.estrelasTexto}>
            {'★'.repeat(post.rating)}
            <Text style={estilos.estrelaVazia}>{'★'.repeat(5 - post.rating)}</Text>
          </Text>
        </View>
      </View>

      {post.note ? <Text style={estilos.postNota}>{post.note}</Text> : null}

      <View style={estilos.postAccoes}>
        <Pressable
          onPress={onGostar}
          accessibilityRole="button"
          accessibilityLabel={post.liked ? 'Retirar gosto' : 'Gostar'}
          style={estilos.accao}
        >
          <Text style={[estilos.accaoTexto, post.liked ? estilos.accaoActiva : null]}>
            {post.liked ? '❤️' : '🤍'} {post.likes}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function FeedVazio({ temVinhos }: { temVinhos: boolean }) {
  return (
    <View style={estilos.vazio}>
      <Text style={estilos.vazioEmoji}>👥</Text>
      <Text style={estilos.vazioTitulo}>O feed ainda está a nascer</Text>
      <Text style={estilos.vazioTexto}>
        {temVinhos
          ? 'Ainda ninguém partilhou provas. Sê o primeiro: abre um vinho da tua cave e conta como estava.'
          : 'Assim que houver provas partilhadas, aparecem aqui. Começa por adicionar vinhos à tua cave.'}
      </Text>
    </View>
  );
}

function Descobrir() {
  return (
    <ScrollView contentContainerStyle={estilos.lista}>
      <Text style={estilos.seccao}>🏭 Produtores a seguir</Text>
      {PRODUTORES.map((p) => (
        <View key={p.nome} style={estilos.produtor}>
          <View style={estilos.produtorAvatar}>
            <Text style={estilos.produtorInicial}>{p.nome.charAt(0)}</Text>
          </View>
          <View style={estilos.produtorInfo}>
            <Text style={estilos.produtorNome}>{p.nome}</Text>
            <Text style={estilos.produtorRegiao}>{p.regiao}</Text>
            <Text style={estilos.produtorNota}>{p.nota}</Text>
          </View>
        </View>
      ))}

      <View style={estilos.nota}>
        <Text style={estilos.notaTexto}>
          🔥 Vinhos em alta e colecionadores perto de ti activam-se quando houver
          partilhas suficientes na comunidade.
        </Text>
      </View>
    </ScrollView>
  );
}

function Desafios({ wines }: { wines: number }) {
  return (
    <ScrollView contentContainerStyle={estilos.lista}>
      {DESAFIOS.map((d) => {
        const pct = d.target > 0 ? Math.min(d.progress / d.target, 1) : 0;
        return (
          <View key={d.id} style={estilos.desafio}>
            <View style={estilos.desafioTopo}>
              <Text style={estilos.desafioEmoji}>{d.emoji}</Text>
              <View style={estilos.desafioInfo}>
                <Text style={estilos.desafioTitulo}>{d.title}</Text>
                <Text style={estilos.desafioDescricao}>{d.description}</Text>
              </View>
            </View>

            <View style={estilos.barraFundo}>
              <View style={[estilos.barraCheia, { width: `${pct * 100}%` }]} />
            </View>
            <View style={estilos.desafioRodape}>
              <Text style={estilos.desafioProgresso}>
                {d.progress} de {d.target}
              </Text>
              <Text style={estilos.desafioRecompensa}>{d.reward}</Text>
            </View>
          </View>
        );
      })}

      <View style={estilos.nota}>
        <Text style={estilos.notaTexto}>
          {wines === 0
            ? 'O progresso conta a partir dos vinhos da tua cave — adiciona os primeiros para arrancar.'
            : 'O progresso passa a contar automaticamente quando o scan estiver disponível.'}
        </Text>
      </View>
    </ScrollView>
  );
}

/** "há 2 horas" · "há 3 dias" */
function haQuanto(iso: string): string {
  const min = Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60_000), 0);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.round(horas / 24);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
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
  abas: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream.mid,
  },
  aba: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.lg, alignItems: 'center', backgroundColor: Colors.cream.light },
  abaActiva: { backgroundColor: Colors.burgundy.primary },
  abaTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  abaTextoActivo: { color: Colors.cream.white, fontFamily: Typography.fonts.sansMedium },
  erro: { backgroundColor: Colors.status.dangerBg, padding: Spacing.lg },
  erroTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.status.dangerText },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: Spacing.lg, paddingBottom: Spacing['4xl'], flexGrow: 1 },
  post: {
    backgroundColor: Colors.cream.white,
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  postTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.burgundy.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTexto: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.cream.white },
  postAutor: { flex: 1 },
  postNome: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  postTempo: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  postVinho: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.cream.light, borderRadius: Radius.md,
    padding: Spacing.lg, marginTop: Spacing.lg,
  },
  postVinhoEmoji: { fontSize: 22 },
  postVinhoInfo: { flex: 1 },
  postVinhoNome: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  postVinhoMeta: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 1 },
  estrelas: { alignItems: 'flex-end' },
  estrelasTexto: { fontSize: Typography.sizes.base, color: Colors.gold.primary },
  estrelaVazia: { color: Colors.cream.dark },
  postNota: {
    fontFamily: Typography.fonts.serifItalic,
    fontSize: Typography.sizes.lg,
    color: Colors.text.secondary,
    lineHeight: 24,
    marginTop: Spacing.lg,
  },
  postAccoes: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.lg },
  accao: { paddingVertical: Spacing.sm },
  accaoTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base, color: Colors.text.muted },
  accaoActiva: { color: Colors.burgundy.primary, fontFamily: Typography.fonts.sansMedium },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'], gap: Spacing.md },
  vazioEmoji: { fontSize: 44 },
  vazioTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.burgundy.primary },
  vazioTexto: {
    fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.base,
    color: Colors.text.muted, textAlign: 'center', lineHeight: 21,
  },
  seccao: {
    fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.xs,
    color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: Spacing.lg,
  },
  produtor: {
    flexDirection: 'row', gap: Spacing.lg, alignItems: 'center',
    backgroundColor: Colors.cream.white, borderWidth: 1, borderColor: Colors.cream.mid,
    borderRadius: Radius.lg, padding: Spacing.xl, marginBottom: Spacing.md,
  },
  produtorAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.gold.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  produtorInicial: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.burgundy.primary },
  produtorInfo: { flex: 1 },
  produtorNome: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.base, color: Colors.text.primary },
  produtorRegiao: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.muted },
  produtorNota: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.secondary, marginTop: Spacing.sm },
  desafio: {
    backgroundColor: Colors.burgundy.primary, borderRadius: Radius.lg,
    padding: Spacing.xl, marginBottom: Spacing.md,
  },
  desafioTopo: { flexDirection: 'row', gap: Spacing.lg },
  desafioEmoji: { fontSize: 26 },
  desafioInfo: { flex: 1 },
  desafioTitulo: { fontFamily: Typography.fonts.serifSemiBold, fontSize: Typography.sizes.xl, color: Colors.cream.white },
  desafioDescricao: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.cream.mid, marginTop: 2, lineHeight: 18 },
  barraFundo: { height: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 3, marginTop: Spacing.xl, overflow: 'hidden' },
  barraCheia: { height: '100%', backgroundColor: Colors.gold.primary, borderRadius: 3 },
  desafioRodape: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  desafioProgresso: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.cream.mid },
  desafioRecompensa: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.sm, color: Colors.gold.light },
  nota: {
    backgroundColor: Colors.cream.light, borderRadius: Radius.md,
    padding: Spacing.xl, marginTop: Spacing.lg,
  },
  notaTexto: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.sm, color: Colors.text.secondary, lineHeight: 19 },
});
