import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COMPETICOES,
  type ChaveCompeticao,
  agrupaPorEstado,
  pairingParaJogo,
  quando,
} from '@/lib/football';
import { fetchFixtures } from '@/lib/footballApi';
import { LISBON_WINE_VENUES } from '@/lib/lisboaAberta';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { Fixture, WineVenue } from '@/types';

/** Gradiente de cabeçalho por liga (secção 10.8). */
const COR_LIGA: Record<ChaveCompeticao, string> = {
  liga_pt: '#004400',
  liga_2: '#1A3A6B',
  ucl: '#001489',
};

type Vista = 'jogos' | 'bares';

export function FootballScreen() {
  const [liga, setLiga] = useState<ChaveCompeticao>('liga_pt');
  const [vista, setVista] = useState<Vista>('jogos');
  const [jogos, setJogos] = useState<Fixture[]>([]);
  const [exemplo, setExemplo] = useState(false);
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    let activo = true;
    setACarregar(true);
    void fetchFixtures(liga).then((r) => {
      if (!activo) return;
      setJogos(r.jogos);
      setExemplo(r.exemplo);
      setACarregar(false);
    });
    return () => {
      activo = false;
    };
  }, [liga]);

  const { proximos, terminados } = agrupaPorEstado(jogos);
  const haDirecto = jogos.some((j) => j.status === 'LIVE');

  return (
    <View style={estilos.fundo}>
      <SafeAreaView edges={['top']} style={[estilos.cabecalho, { backgroundColor: COR_LIGA[liga] }]}>
        <View style={estilos.tituloLinha}>
          <View>
            <Text style={estilos.titulo}>Futebol &amp; Vinho</Text>
            <Text style={estilos.subtitulo}>{COMPETICOES[liga].nome}</Text>
          </View>
          {haDirecto ? (
            <View style={estilos.directo}>
              <Text style={estilos.directoTexto}>● AO VIVO</Text>
            </View>
          ) : null}
        </View>

        <View style={estilos.ligas}>
          {(Object.keys(COMPETICOES) as ChaveCompeticao[]).map((c) => {
            const activa = c === liga;
            return (
              <Pressable
                key={c}
                onPress={() => setLiga(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                style={[estilos.ligaBotao, activa ? estilos.ligaActiva : null]}
              >
                <Text style={[estilos.ligaTexto, activa ? estilos.ligaTextoActivo : null]}>
                  {COMPETICOES[c].emoji} {COMPETICOES[c].nome}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <View style={estilos.vistas}>
        {(['jogos', 'bares'] as Vista[]).map((v) => (
          <Pressable
            key={v}
            onPress={() => setVista(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: v === vista }}
            style={[estilos.vista, v === vista ? estilos.vistaActiva : null]}
          >
            <Text style={[estilos.vistaTexto, v === vista ? estilos.vistaTextoActivo : null]}>
              {v === 'jogos' ? '⚽ Jogos' : '🍷 Wine Bars'}
            </Text>
          </Pressable>
        ))}
      </View>

      {vista === 'bares' ? (
        <FlatList
          data={LISBON_WINE_VENUES}
          keyExtractor={(v) => v.id}
          contentContainerStyle={estilos.lista}
          renderItem={({ item }) => <CartaoVenue venue={item} />}
        />
      ) : aCarregar ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={Colors.burgundy.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.lista}>
          {exemplo ? (
            <View style={estilos.avisoExemplo}>
              <Text style={estilos.avisoExemploTexto}>
                Jogos de exemplo — liga a API do football-data.org para veres os
                calendários reais.
              </Text>
            </View>
          ) : null}

          {proximos.length > 0 ? <Text style={estilos.seccao}>A seguir</Text> : null}
          {proximos.map((j) => (
            <CartaoJogo key={j.id} jogo={j} />
          ))}

          {terminados.length > 0 ? <Text style={estilos.seccao}>Terminados</Text> : null}
          {terminados.map((j) => (
            <CartaoJogo key={j.id} jogo={j} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CartaoJogo({ jogo }: { jogo: Fixture }) {
  const [aberto, setAberto] = useState(false);
  const pairing = pairingParaJogo(jogo);
  const terminado = jogo.status === 'FINISHED';

  return (
    <Pressable
      onPress={() => setAberto((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: aberto }}
      style={estilos.jogo}
    >
      <View style={estilos.jogoTopo}>
        <Text style={estilos.jogoMeta}>
          {jogo.matchday ? `Jornada ${jogo.matchday} · ` : ''}
          {quando(jogo.date)}
        </Text>
        {jogo.status === 'LIVE' ? (
          <Text style={estilos.jogoDirecto}>
            AO VIVO{jogo.minute ? ` ${jogo.minute}'` : ''}
          </Text>
        ) : null}
      </View>

      <View style={estilos.jogoLinha}>
        <Text style={estilos.equipa} numberOfLines={1}>
          {jogo.homeTeam}
        </Text>
        <View style={estilos.resultado}>
          <Text style={estilos.resultadoTexto}>
            {jogo.score ? `${jogo.score.home} — ${jogo.score.away}` : 'vs'}
          </Text>
          {terminado ? <Text style={estilos.ft}>FT</Text> : null}
        </View>
        <Text style={[estilos.equipa, estilos.equipaDireita]} numberOfLines={1}>
          {jogo.awayTeam}
        </Text>
      </View>

      <View style={estilos.pairingResumo}>
        <Text style={estilos.pairingResumoTexto}>🍷 {pairing.wine_name}</Text>
        <Text style={estilos.expandir}>{aberto ? '▲' : '▼'}</Text>
      </View>

      {aberto ? (
        <View style={estilos.pairing}>
          <Text style={estilos.pairingNome}>{pairing.wine_name}</Text>
          <Text style={estilos.pairingMeta}>
            {pairing.producer} · {pairing.region}
          </Text>
          <Text style={estilos.pairingRazao}>{pairing.reason}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function CartaoVenue({ venue }: { venue: WineVenue }) {
  const tipos: Record<WineVenue['type'], string> = {
    wine_bar: '🍷',
    restaurant: '🍽️',
    garrafeira: '🏛️',
    mercado: '🧺',
  };

  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(
          `https://www.google.com/maps/search/${encodeURIComponent(`${venue.name} ${venue.address} Lisboa`)}`,
        );
      }}
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, ${venue.neighborhood}. Abrir no mapa.`}
      style={estilos.venue}
    >
      <Text style={estilos.venueEmoji}>{tipos[venue.type]}</Text>
      <View style={estilos.venueInfo}>
        <Text style={estilos.venueNome}>{venue.name}</Text>
        <Text style={estilos.venueMorada}>
          {venue.address} · {venue.neighborhood}
        </Text>
        {venue.specialty ? (
          <Text style={estilos.venueEspecialidade}>{venue.specialty}</Text>
        ) : null}
        {venue.match_day_partner ? (
          <View style={estilos.parceiro}>
            <Text style={estilos.parceiroTexto}>⚽ Match Day</Text>
          </View>
        ) : null}
      </View>
      <View style={estilos.venueDireita}>
        <Text style={estilos.venueRating}>★ {venue.rating.toFixed(1).replace('.', ',')}</Text>
        <Text style={estilos.venuePreco}>{'€'.repeat(venue.price_range)}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.xl },
  tituloLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
  directo: {
    backgroundColor: Colors.status.liveBg,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  directoTexto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.xs,
    color: '#FFF',
  },
  ligas: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl, flexWrap: 'wrap' },
  ligaBotao: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  ligaActiva: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'transparent' },
  ligaTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  ligaTextoActivo: { color: Colors.text.primary },
  vistas: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream.mid,
  },
  vista: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.cream.light,
  },
  vistaActiva: { backgroundColor: Colors.burgundy.primary },
  vistaTexto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  vistaTextoActivo: { color: Colors.cream.white },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },
  avisoExemplo: {
    backgroundColor: Colors.status.warningBg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  avisoExemploTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.status.warningText,
    lineHeight: 18,
  },
  seccao: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  jogo: {
    backgroundColor: Colors.cream.white,
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  jogoTopo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  jogoMeta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  jogoDirecto: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.status.liveBg,
  },
  jogoLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  equipa: {
    flex: 1,
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  equipaDireita: { textAlign: 'right' },
  resultado: { backgroundColor: Colors.burgundy.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  resultadoTexto: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.cream.white,
  },
  ft: { fontFamily: Typography.fonts.sans, fontSize: 9, color: Colors.cream.mid },
  pairingResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.cream.mid,
  },
  pairingResumoTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  expandir: { fontSize: 10, color: Colors.text.muted },
  pairing: {
    marginTop: Spacing.md,
    backgroundColor: Colors.cream.light,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  pairingNome: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.burgundy.primary,
  },
  pairingMeta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
    marginTop: 1,
  },
  pairingRazao: {
    fontFamily: Typography.fonts.serifItalic,
    fontSize: Typography.sizes.lg,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  venue: {
    flexDirection: 'row',
    gap: Spacing.lg,
    backgroundColor: Colors.cream.white,
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  venueEmoji: { fontSize: 24 },
  venueInfo: { flex: 1 },
  venueNome: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  venueMorada: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
    marginTop: 1,
  },
  venueEspecialidade: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  parceiro: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gold.pale,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    marginTop: Spacing.sm,
  },
  parceiroTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
    color: Colors.gold.deep,
  },
  venueDireita: { alignItems: 'flex-end' },
  venueRating: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.gold.deep,
  },
  venuePreco: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
    marginTop: 2,
  },
});
