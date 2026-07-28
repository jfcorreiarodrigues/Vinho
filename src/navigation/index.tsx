import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Modal, StyleSheet, Text } from 'react-native';

import { CaveScreen } from '@/screens/CaveScreen';
import { EmConstrucao } from '@/screens/EmConstrucao';
import { EntradaManualScreen } from '@/screens/EntradaManualScreen';
import { FootballScreen } from '@/screens/FootballScreen';
import { InvestmentScreen } from '@/screens/InvestmentScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ScanScreen } from '@/screens/ScanScreen';
import { SocialScreen } from '@/screens/SocialScreen';
import { WineDetailScreen } from '@/screens/WineDetailScreen';
import { Colors, Typography } from '@/theme';
import type { Wine } from '@/types';

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
  Sommelier: () => (
    <EmConstrucao
      titulo="Sommelier"
      subtitulo="de Alvalade"
      emoji="🧑‍🍳"
      passo="Passo 8 — Chat contextual"
    />
  ),
} as const satisfies Record<
  Exclude<keyof MainTabParamList, 'Scan' | 'Cave' | 'Futebol' | 'Social' | 'Perfil'>,
  React.ComponentType
>;

/** Separadores já implementados, que não passam pelos placeholders. */
const ECRAS: Partial<Record<keyof MainTabParamList, React.ComponentType>> = {
  Futebol: FootballScreen,
  Social: SocialScreen,
};

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
  // O detalhe e a entrada manual são modais sobre os separadores, geridos
  // aqui em estado local: são dois ecrãs efémeros que não justificam um
  // stack navigator próprio nem entradas no histórico.
  const [vinhoAberto, setVinhoAberto] = useState<Wine | null>(null);
  const [aAdicionar, setAAdicionar] = useState(false);
  const [portfolioAberto, setPortfolioAberto] = useState(false);

  return (
    <>
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.burgundy.primary,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarStyle: estilos.barra,
        tabBarLabelStyle: estilos.etiqueta,
      }}
    >
      {ORDEM.map((nome) =>
        nome === 'Scan' ? (
          <Tabs.Screen
            key={nome}
            name="Scan"
            options={{ tabBarIcon: ({ focused }) => <Icone simbolo={icones.Scan} focado={focused} /> }}
          >
            {() => (
              <ScanScreen
                onAbrirVinho={setVinhoAberto}
                onEntradaManual={() => setAAdicionar(true)}
                onAbrirPortfolio={() => setPortfolioAberto(true)}
              />
            )}
          </Tabs.Screen>
        ) : nome === 'Cave' ? (
          <Tabs.Screen
            key={nome}
            name="Cave"
            options={{
              tabBarIcon: ({ focused }) => <Icone simbolo={icones.Cave} focado={focused} />,
            }}
          >
            {() => (
              <CaveScreen
                onAbrirVinho={setVinhoAberto}
                onAdicionar={() => setAAdicionar(true)}
              />
            )}
          </Tabs.Screen>
        ) : nome === 'Perfil' ? (
          <Tabs.Screen
            key={nome}
            name="Perfil"
            options={{ tabBarIcon: ({ focused }) => <Icone simbolo={icones.Perfil} focado={focused} /> }}
          >
            {() => <ProfileScreen onAbrirPortfolio={() => setPortfolioAberto(true)} />}
          </Tabs.Screen>
        ) : (
          <Tabs.Screen
            key={nome}
            name={nome}
            component={ECRAS[nome] ?? placeholders[nome as keyof typeof placeholders]}
            options={{
              tabBarIcon: ({ focused }) => (
                <Icone simbolo={icones[nome]} focado={focused} />
              ),
            }}
          />
        ),
      )}
    </Tabs.Navigator>

    <Modal
      visible={vinhoAberto !== null}
      animationType="slide"
      onRequestClose={() => setVinhoAberto(null)}
      presentationStyle="pageSheet"
    >
      {vinhoAberto ? (
        <WineDetailScreen wine={vinhoAberto} onFechar={() => setVinhoAberto(null)} />
      ) : null}
    </Modal>

    <Modal
      visible={portfolioAberto}
      animationType="slide"
      onRequestClose={() => setPortfolioAberto(false)}
      presentationStyle="pageSheet"
    >
      <InvestmentScreen onFechar={() => setPortfolioAberto(false)} />
    </Modal>

    <Modal
      visible={aAdicionar}
      animationType="slide"
      onRequestClose={() => setAAdicionar(false)}
      presentationStyle="pageSheet"
    >
      <EntradaManualScreen onFechar={() => setAAdicionar(false)} />
    </Modal>
    </>
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
