import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { MainTabs } from '@/navigation';
import { AuthScreen } from '@/screens/AuthScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { useStore } from '@/store';
import { Colors } from '@/theme';

const CHAVE_ONBOARDING = 'vinhavibe:onboarding-visto';

export default function App() {
  const [fontesProntas] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_400Italic: CormorantGaramond_400Regular_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  // `null` = ainda a ler do AsyncStorage; evita o onboarding piscar a quem já
  // o viu.
  const [onboardingVisto, setOnboardingVisto] = useState<boolean | null>(null);
  const [sessaoVerificada, setSessaoVerificada] = useState(false);

  const user = useStore((s) => s.user);
  const carregarSessao = useStore((s) => s.carregarSessao);
  const setUser = useStore((s) => s.setUser);

  useEffect(() => {
    void AsyncStorage.getItem(CHAVE_ONBOARDING).then((v) =>
      setOnboardingVisto(v === '1'),
    );
  }, []);

  useEffect(() => {
    void carregarSessao().finally(() => setSessaoVerificada(true));

    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      // SIGNED_IN, TOKEN_REFRESHED e USER_UPDATED podem trazer perfil novo.
      void carregarSessao();
    });

    return () => data.subscription.unsubscribe();
  }, [carregarSessao, setUser]);

  const terminarOnboarding = useCallback(() => {
    setOnboardingVisto(true);
    void AsyncStorage.setItem(CHAVE_ONBOARDING, '1');
  }, []);

  const aArrancar = !fontesProntas || onboardingVisto === null || !sessaoVerificada;

  return (
    <GestureHandlerRootView style={estilos.raiz}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {aArrancar ? (
          <View style={estilos.arranque}>
            <ActivityIndicator color={Colors.gold.primary} size="large" />
          </View>
        ) : !onboardingVisto ? (
          <OnboardingScreen onTerminar={terminarOnboarding} />
        ) : !user ? (
          <AuthScreen />
        ) : (
          <NavigationContainer>
            <MainTabs />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  arranque: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.burgundy.primary,
  },
});
