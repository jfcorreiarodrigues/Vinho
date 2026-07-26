import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Paleta VinhaVibe. Os valores vêm da secção 4 da especificação e não devem
 * ser alterados sem rever o design system — vários ecrãs dependem do contraste
 * exacto entre `burgundy.primary` e `cream.white`.
 */
export const Colors = {
  burgundy: {
    deep: '#2A0505', // backgrounds escuros
    primary: '#3D0B0B', // cor principal
    mid: '#6B1A1A', // links, accents
    light: '#9E3535', // bordas activas
  },
  cream: {
    white: '#FDFAF4', // background principal
    light: '#F5EFE0', // cards, inputs
    mid: '#E8DFC8', // bordas, separadores
    dark: '#D4C9A8', // separadores sobre fundo cream
  },
  gold: {
    primary: '#C9A84C', // CTAs principais, estrelas
    light: '#E8C97A', // texto em fundo escuro
    pale: '#F5E4A8', // backgrounds de badges
    deep: '#6B4400', // texto em fundo dourado
  },
  pureza: {
    bg: '#E8F5E4', // badge natural
    text: '#2D6B20', // texto natural
  },
  text: {
    primary: '#1A0A0A',
    secondary: '#5C3333',
    muted: '#9C7575',
  },
  /**
   * Cores semânticas. Não constam da secção 4 mas são exigidas por ecrãs que
   * a spec descreve: banner de pico (10.4), ROI acima/abaixo da inflação (10.9)
   * e estados de erro nos formulários (10.2).
   */
  status: {
    warningBg: '#FEF3C7',
    warningText: '#92400E',
    successBg: '#E8F5E4',
    successText: '#2D6B20',
    dangerBg: '#FEE2E2',
    dangerText: '#991B1B',
    liveBg: '#E53E3E',
  },
} as const;

export const Typography = {
  fonts: {
    serifSemiBold: 'CormorantGaramond_600SemiBold',
    serifItalic: 'CormorantGaramond_400Italic',
    sans: 'DMSans_400Regular',
    sansMedium: 'DMSans_500Medium',
    sansLight: 'DMSans_300Light',
  },
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#1A0A0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A0A0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} satisfies Record<string, ViewStyle>;

/** Duração padrão das transições de estado (secção 15 — UX). */
export const MOTION_MS = 150;

/**
 * Presets tipográficos usados repetidamente. Evita repetir a combinação
 * fonte+tamanho+cor em cada StyleSheet.
 */
export const TextPresets = {
  screenTitle: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.cream.white,
  },
  screenSubtitle: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.sm,
    color: Colors.gold.light,
  },
  cardTitle: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  cardMeta: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  sectionLabel: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  tastingNote: {
    fontFamily: Typography.fonts.serifItalic,
    fontSize: Typography.sizes.lg,
    color: Colors.text.secondary,
  },
} satisfies Record<string, TextStyle>;

export type ColorScale = typeof Colors;
export type SpacingKey = keyof typeof Spacing;
export type RadiusKey = keyof typeof Radius;
export type FontSizeKey = keyof typeof Typography.sizes;

export const Theme = {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadow,
  TextPresets,
  MOTION_MS,
} as const;

export default Theme;
