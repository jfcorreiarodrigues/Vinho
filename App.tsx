import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Ponto de entrada mínimo. A navegação completa (Onboarding → Auth → MainTabs)
// é adicionada no passo 5 da secção 16 da especificação.
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VinhaVibe</Text>
      <Text style={styles.subtitle}>Cave Privada · Lisboa</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D0B0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#E8C97A',
    fontSize: 32,
    letterSpacing: 3,
  },
  subtitle: {
    color: '#F5EFE0',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
