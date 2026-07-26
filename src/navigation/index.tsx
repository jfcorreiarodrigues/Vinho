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
      <Tabs.Screen
        name="Scan"
        options={{
          tabBarIcon: ({ focused }) => <Icone simbolo="📷" focado={focused} />,
        }}
      >
        {() => (
          <EmConstrucao
            titulo="VinhaVibe"
            subtitulo="Cave Privada · Lisboa"
            emoji="📷"
            passo="Passo 6 — Scan + Gemini Vision"
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen
        name="Cave"
        options={{
          tabBarIcon: ({ focused }) => <Icone simbolo="🏛️" focado={focused} />,
        }}
      >
        {() => (
          <EmConstrucao
            titulo="A Minha Cave"
            subtitulo="Inventário"
            emoji="🏛️"
            passo="Passo 7 — Cave + Detalhe do vinho"
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen
        name="Sommelier"
        options={{
          tabBarIcon: ({ focused }) => <Icone simbolo="🧑‍🍳" focado={focused} />,
        }}
      >
        {() => (
          <EmConstrucao
            titulo="Sommelier"
            subtitulo="de Alvalade"
            emoji="🧑‍🍳"
            passo="Passo 8 — Chat contextual"
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen
        name="Futebol"
        options={{
          tabBarIcon: ({ focused }) => <Icone simbolo="⚽" focado={focused} />,
        }}
      >
        {() => (
          <EmConstrucao
            titulo="Futebol & Vinho"
            subtitulo="Ligas portuguesas"
            emoji="⚽"
            passo="Passo 9 — football-data.org"
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen
        name="Social"
        options={{
          tabBarIcon: ({ focused }) => <Icone simbolo="👥" focado={focused} />,
        }}
      >
        {() => (
          <EmConstrucao
            titulo="VinhaFeed"
            subtitulo="Rede de amantes de vinho"
            emoji="👥"
            passo="Passo 10 — Feed social"
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen
        name="Perfil"
        options={{
          tabBarIcon: ({ focused }) => <Icone simbolo="👤" focado={focused} />,
        }}
      >
        {() => (
          <EmConstrucao
            titulo="Perfil"
            subtitulo="Conta e preferências"
            emoji="👤"
            passo="Passo 13 — Perfil + Stripe"
          />
        )}
      </Tabs.Screen>
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
