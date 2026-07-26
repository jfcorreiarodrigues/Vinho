import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { signIn, signUp } from '@/lib/supabase';
import { Colors, Radius, Spacing, Typography } from '@/theme';

type Modo = 'entrar' | 'registar';

export function AuthScreen() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const aRegistar = modo === 'registar';

  function validar(): string | null {
    if (aRegistar && nome.trim().length < 2) {
      return 'Escreve o teu nome.';
    }
    if (!email.includes('@') || !email.includes('.')) {
      return 'O endereço de email não parece válido.';
    }
    if (password.length < 6) {
      return 'A palavra-passe tem de ter pelo menos 6 caracteres.';
    }
    return null;
  }

  async function submeter() {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }

    setErro(null);
    setOcupado(true);

    const r = aRegistar
      ? await signUp(nome.trim(), email.trim(), password)
      : await signIn(email.trim(), password);

    setOcupado(false);

    // Em caso de sucesso não navegamos aqui: o onAuthStateChange no App.tsx
    // detecta a sessão e troca de stack sozinho.
    if (!r.ok) setErro(r.error);
  }

  function trocarModo() {
    setModo(aRegistar ? 'entrar' : 'registar');
    setErro(null);
  }

  return (
    <LinearGradient
      colors={[Colors.burgundy.deep, Colors.burgundy.primary]}
      style={estilos.fundo}
    >
      <KeyboardAvoidingView
        style={estilos.fundo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={estilos.seguro} edges={['top']}>
          <View style={estilos.marca}>
            <Text style={estilos.logo}>VinhaVibe</Text>
            <Text style={estilos.mote}>
              A tua cave, levada a sério
            </Text>
          </View>

          <ScrollView
            style={estilos.cartao}
            contentContainerStyle={estilos.cartaoConteudo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={estilos.titulo}>
              {aRegistar ? 'Criar conta' : 'Bem-vindo de volta'}
            </Text>

            {aRegistar ? (
              <CampoTexto
                etiqueta="Nome"
                valor={nome}
                onChange={setNome}
                placeholder="Ricardo Fonseca"
              />
            ) : null}

            <CampoTexto
              etiqueta="Email"
              valor={email}
              onChange={setEmail}
              placeholder="tu@exemplo.pt"
              tipo="email"
            />

            <CampoTexto
              etiqueta="Palavra-passe"
              valor={password}
              onChange={setPassword}
              placeholder="Pelo menos 6 caracteres"
              tipo="password"
              onSubmit={submeter}
            />

            {erro ? (
              <View style={estilos.avisoErro} accessibilityLiveRegion="polite">
                <Text style={estilos.avisoErroTexto}>{erro}</Text>
              </View>
            ) : null}

            <Botao
              titulo={aRegistar ? 'Criar conta' : 'Entrar'}
              onPress={submeter}
              ocupado={ocupado}
            />

            <Pressable
              onPress={trocarModo}
              accessibilityRole="button"
              style={estilos.alternar}
              hitSlop={8}
            >
              <Text style={estilos.alternarTexto}>
                {aRegistar
                  ? 'Já tens conta? Entra aqui'
                  : 'Ainda não tens conta? Cria uma'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1 },
  seguro: { flex: 1, justifyContent: 'flex-end' },
  marca: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing['3xl'],
  },
  logo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['5xl'],
    color: Colors.gold.light,
    letterSpacing: 3,
  },
  mote: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.base,
    color: Colors.cream.mid,
    marginTop: Spacing.md,
  },
  cartao: {
    backgroundColor: Colors.cream.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '72%',
  },
  cartaoConteudo: {
    padding: Spacing['3xl'],
    paddingBottom: Spacing['4xl'],
  },
  titulo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.burgundy.primary,
    marginBottom: Spacing['2xl'],
  },
  avisoErro: {
    backgroundColor: Colors.status.dangerBg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  avisoErroTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: Colors.status.dangerText,
  },
  alternar: { marginTop: Spacing.xl, alignItems: 'center' },
  alternarTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: Colors.burgundy.mid,
  },
});
