import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/theme';

interface Props {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: 'texto' | 'email' | 'password';
  /** Distingue palavra-passe nova de existente para os gestores de senhas. */
  novaPassword?: boolean;
  erro?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export const CampoTexto = forwardRef<TextInput, Props>(function CampoTexto(
  {
    etiqueta, valor, onChange, placeholder, tipo = 'texto',
    erro, onSubmit, autoFocus, novaPassword = false,
  },
  ref,
) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        ref={ref}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        autoFocus={autoFocus}
        secureTextEntry={tipo === 'password'}
        keyboardType={tipo === 'email' ? 'email-address' : 'default'}
        autoCapitalize={tipo === 'texto' ? 'words' : 'none'}
        autoComplete={
          tipo === 'email'
            ? 'email'
            : tipo === 'password'
              ? (novaPassword ? 'new-password' : 'current-password')
              : 'name'
        }
        autoCorrect={false}
        returnKeyType={onSubmit ? 'go' : 'next'}
        onSubmitEditing={onSubmit}
        accessibilityLabel={etiqueta}
        style={[estilos.campo, erro ? estilos.campoComErro : null]}
      />
      {erro ? (
        <Text style={estilos.erro} accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : null}
    </View>
  );
});

const estilos = StyleSheet.create({
  grupo: { marginBottom: Spacing.xl },
  etiqueta: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  campo: {
    backgroundColor: Colors.cream.light,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg + 2,
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.lg,
    color: Colors.text.primary,
    minHeight: 48,
  },
  campoComErro: { borderColor: Colors.status.dangerText },
  erro: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.status.dangerText,
    marginTop: Spacing.xs,
  },
});
