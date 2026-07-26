import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text } from 'react-native';

import { EmConstrucao } from '@/screens/EmConstrucao';
import { Colors, Typography } from '@/theme';

export type MainTabParamList = {
  Scan: undefined;
  Cave: undefined;
  Sommelier: undefined;
  Futebol: undefined;
  Social: undefined;
  Perfil: undefined;
};

const Tabs = createBottomTabNavigator<MainTabParamList>();

/** Os separadores usam emoji como ícone, à semelhança do preview HTML. */
function Icone({ simbolo, focado }: { simbolo: string; focado: boolean }) {
  return (
    <Text style={[estilos.icone, focado ? estilos.iconeActivo : null]}>
      {simbolo}
    </Text>
  );
}

/**
 * Placeholders declarados ao nível do módulo. Como componentes inline no
 * `<Tabs.Screen>` seriam uma identidade nova a cada render do navigator, o
 * que desmonta e remonta o ecrã em vez de o actualizar.
 */
const placeholders = {
  Scan: () => (
    <EmConstrucao
      titulo="VinhaVibe"
      subtitulo="Cave Privada · Lisboa"
      emoji="📷"
      passo="Passo 6 — Scan + Gemini Vision"
    />
  ),
  Cave: () => (
    <EmConstrucao
      titulo="A Minha Cave"
      subtitulo="Inventário"
      emoji="🏛️"
      passo="Passo 7 — Cave + Detalhe do vinho"
    />
  ),
  Sommelier: () => (
    <EmConstrucao
      titulo="Sommelier"
      subtitulo="de Alvalade"
      emoji="🧑‍🍳"
      passo="Passo 8 — Chat contextual"
    />
  ),
  Futebol: () => (
    <EmConstrucao
      titulo="Futebol & Vinho"
      subtitulo="Ligas portuguesas"
      emoji="⚽"
      passo="Passo 9 — football-data.org"
    />
  ),
  Social: () => (
    <EmConstrucao
      titulo="VinhaFeed"
      subtitulo="Rede de amantes de vinho"
      emoji="👥"
      passo="Passo 10 — Feed social"
    />
  ),
  Perfil: () => (
    <EmConstrucao
      titulo="Perfil"
      subtitulo="Conta e preferências"
      emoji="👤"
      passo="Passo 13 — Perfil + Stripe"
    />
  ),
} as const satisfies Record<keyof MainTabParamList, React.ComponentType>;

const icones: Record<keyof MainTabParamList, string> = {
  Scan: '📷',
  Cave: '🏛️',
  Sommelier: '🧑‍🍳',
  Futebol: '⚽',
  Social: '👥',
  Perfil: '👤',
};

const ORDEM = [
  'Scan',
  'Cave',
  'Sommelier',
  'Futebol',
  'Social',
  'Perfil',
] as const satisfies readonly (keyof MainTabParamList)[];

export function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.burgundy.primary,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarStyle: estilos.barra,
        tabBarLabelStyle: estilos.etiqueta,
      }}
    >
      {ORDEM.map((nome) => (
        <Tabs.Screen
          key={nome}
          name={nome}
          component={placeholders[nome]}
          options={{
            tabBarIcon: ({ focused }) => (
              <Icone simbolo={icones[nome]} focado={focused} />
            ),
          }}
        />
      ))}
    </Tabs.Navigator>
  );
}

const estilos = StyleSheet.create({
  barra: {
    backgroundColor: Colors.cream.white,
    borderTopColor: Colors.cream.mid,
    height: 64,
    paddingTop: 6,
  },
  etiqueta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
  icone: { fontSize: 20, opacity: 0.55 },
  iconeActivo: { opacity: 1 },
});
