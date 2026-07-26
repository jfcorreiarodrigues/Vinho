import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Colors, Spacing, Typography } from '@/theme';

interface Slide {
  id: string;
  emoji: string;
  titulo: string;
  descricao: string;
}

const SLIDES: Slide[] = [
  {
    id: 'scan',
    emoji: '📷',
    titulo: 'Scan Inteligente',
    descricao:
      'Aponta a câmara à etiqueta e a app identifica produtor, casta, região e ano — pensada para os pequenos produtores portugueses.',
  },
  {
    id: 'pureza',
    emoji: '🌿',
    titulo: 'Pureza & Natural',
    descricao:
      'Vinhos de baixa intervenção, biológicos e biodinâmicos sinalizados com o selo Pureza. Para quem procura autenticidade na garrafa.',
  },
  {
    id: 'investimento',
    emoji: '📈',
    titulo: 'Investimento Vivo',
    descricao:
      'Acompanha o valor da tua cave ao longo do tempo e compara a valorização com a inflação portuguesa.',
  },
  {
    id: 'sommelier',
    emoji: '🧑‍🍳',
    titulo: 'Sommelier de Alvalade',
    descricao:
      'Um sommelier que conhece a tua cave, o tempo que está hoje em Lisboa e o que há de fresco nos mercados municipais.',
  },
  {
    id: 'futebol',
    emoji: '⚽',
    titulo: 'Futebol & Vinho',
    descricao:
      'Liga Portugal, Liga 2 e Champions com sugestão de vinho para cada jogo. Porque um clássico merece melhor do que uma cerveja.',
  },
];

interface Props {
  onTerminar: () => void;
}

export function OnboardingScreen({ onTerminar }: Props) {
  // Reactivo em vez de lido uma vez no import: com o valor capturado, o
  // paging ficava desalinhado em ecrãs dobráveis ou multi-janela.
  const { width: LARGURA } = useWindowDimensions();
  const [indice, setIndice] = useState(0);
  const listaRef = useRef<FlatList<Slide>>(null);

  const ultimo = indice === SLIDES.length - 1;

  const verItens = useRef((info: { viewableItems: ViewToken[] }) => {
    const primeiro = info.viewableItems[0];
    if (primeiro?.index != null) setIndice(primeiro.index);
  }).current;

  const criterioVisibilidade = useRef({ itemVisiblePercentThreshold: 60 }).current;

  function avancar() {
    if (ultimo) {
      onTerminar();
      return;
    }
    const proximo = indice + 1;
    listaRef.current?.scrollToIndex({ index: proximo, animated: true });
    setIndice(proximo);
  }

  return (
    <LinearGradient
      colors={[Colors.burgundy.deep, Colors.burgundy.primary]}
      style={estilos.fundo}
    >
      <SafeAreaView style={estilos.seguro} edges={['top', 'bottom']}>
        <View style={estilos.barraTopo}>
          <Pressable
            onPress={onTerminar}
            accessibilityRole="button"
            accessibilityLabel="Saltar introdução"
            hitSlop={12}
          >
            <Text style={estilos.saltar}>Saltar</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listaRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={verItens}
          viewabilityConfig={criterioVisibilidade}
          getItemLayout={(_, i) => ({
            length: LARGURA,
            offset: LARGURA * i,
            index: i,
          })}
          renderItem={({ item }) => (
            <View style={[estilos.slide, { width: LARGURA }]}>
              <Text style={estilos.emoji}>{item.emoji}</Text>
              <Text style={estilos.titulo}>{item.titulo}</Text>
              <Text style={estilos.descricao}>{item.descricao}</Text>
            </View>
          )}
        />

        <View style={estilos.rodape}>
          <View
            style={estilos.pontos}
            accessibilityLabel={`Ecrã ${indice + 1} de ${SLIDES.length}`}
          >
            {SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[estilos.ponto, i === indice ? estilos.pontoActivo : null]}
              />
            ))}
          </View>

          <Botao
            titulo={ultimo ? 'Começar' : 'Próximo'}
            variante="dourado"
            onPress={avancar}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1 },
  seguro: { flex: 1 },
  barraTopo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  saltar: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: 'rgba(245,239,224,0.6)',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4xl'],
  },
  emoji: { fontSize: 56, marginBottom: Spacing['3xl'] },
  titulo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['4xl'],
    color: Colors.cream.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  descricao: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.lg,
    lineHeight: 24,
    color: Colors.cream.mid,
    textAlign: 'center',
  },
  rodape: { paddingHorizontal: Spacing['3xl'], paddingBottom: Spacing['2xl'] },
  pontos: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing['3xl'],
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pontoActivo: {
    width: 24,
    backgroundColor: Colors.gold.primary,
  },
});
