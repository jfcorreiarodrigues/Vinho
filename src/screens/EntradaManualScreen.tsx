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
import { EMOJI_POR_TIPO } from '@/components/CartaoVinho';
import { useStore } from '@/store';
import { Colors, Radius, Spacing, Typography } from '@/theme';
import type { WineType } from '@/types';

const TIPOS: { chave: WineType; texto: string }[] = [
  { chave: 'tinto', texto: 'Tinto' },
  { chave: 'branco', texto: 'Branco' },
  { chave: 'rose', texto: 'Rosé' },
  { chave: 'espumante', texto: 'Espumante' },
  { chave: 'fortificado', texto: 'Fortificado' },
];

interface Props {
  onFechar: () => void;
}

export function EntradaManualScreen({ onFechar }: Props) {
  const user = useStore((s) => s.user);
  const addWine = useStore((s) => s.addWine);
  const erroStore = useStore((s) => s.error);

  const [nome, setNome] = useState('');
  const [produtor, setProdutor] = useState('');
  const [regiao, setRegiao] = useState('');
  const [casta, setCasta] = useState('');
  const [ano, setAno] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState('');
  const [tipo, setTipo] = useState<WineType>('tinto');
  const [natural, setNatural] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function validar(): string | null {
    if (nome.trim().length < 2) return 'Escreve o nome do vinho.';
    if (produtor.trim().length < 2) return 'Escreve o produtor.';
    if (regiao.trim().length < 2) return 'Escreve a região.';

    const q = Number(quantidade);
    if (!Number.isInteger(q) || q < 1) return 'A quantidade tem de ser um número inteiro maior que zero.';

    if (ano.trim()) {
      const a = Number(ano);
      if (!Number.isInteger(a) || a < 1800 || a > 2100) {
        return 'O ano tem de estar entre 1800 e 2100.';
      }
    }
    if (preco.trim()) {
      const p = Number(preco.replace(',', '.'));
      if (!Number.isFinite(p) || p < 0) return 'O preço não é válido.';
    }
    return null;
  }

  async function guardar() {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    if (!user) {
      setErro('Sessão expirada. Entra outra vez.');
      return;
    }

    setErro(null);
    setOcupado(true);

    const guardou = await addWine({
      user_id: user.id,
      name: nome.trim(),
      producer: produtor.trim(),
      region: regiao.trim(),
      country: 'Portugal',
      wine_type: tipo,
      grape_varieties: casta.trim() ? casta.split(',').map((c) => c.trim()) : [],
      vintage: ano.trim() ? Number(ano) : undefined,
      quantity: Number(quantidade),
      purchase_price: preco.trim() ? Number(preco.replace(',', '.')) : undefined,
      purchase_date: new Date().toISOString().slice(0, 10),
      food_pairings: [],
      is_natural: natural,
      is_low_intervention: natural,
      is_organic: false,
      is_biodynamic: false,
      source: 'manual',
    });

    setOcupado(false);
    if (guardou) onFechar();
  }

  return (
    <KeyboardAvoidingView
      style={estilos.fundo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={estilos.cabecalho}>
        <View style={estilos.barra}>
          <Text style={estilos.titulo}>Adicionar vinho</Text>
          <Pressable onPress={onFechar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={estilos.fechar}>✕</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={estilos.grupo}>Tipo</Text>
        <View style={estilos.tipos}>
          {TIPOS.map((t) => {
            const activo = t.chave === tipo;
            return (
              <Pressable
                key={t.chave}
                onPress={() => setTipo(t.chave)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                style={[estilos.tipo, activo ? estilos.tipoActivo : null]}
              >
                <Text style={estilos.tipoEmoji}>{EMOJI_POR_TIPO[t.chave]}</Text>
                <Text style={[estilos.tipoTexto, activo ? estilos.tipoTextoActivo : null]}>
                  {t.texto}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <CampoTexto etiqueta="Nome" valor={nome} onChange={setNome} placeholder="Redoma Tinto" />
        <CampoTexto etiqueta="Produtor" valor={produtor} onChange={setProdutor} placeholder="Niepoort" />
        <CampoTexto etiqueta="Região" valor={regiao} onChange={setRegiao} placeholder="Douro" />
        <CampoTexto
          etiqueta="Castas (separadas por vírgula)"
          valor={casta}
          onChange={setCasta}
          placeholder="Touriga Nacional, Tinta Roriz"
        />

        <View style={estilos.linha}>
          <View style={estilos.meia}>
            <CampoTexto etiqueta="Ano" valor={ano} onChange={setAno} placeholder="2020" />
          </View>
          <View style={estilos.meia}>
            <CampoTexto etiqueta="Garrafas" valor={quantidade} onChange={setQuantidade} placeholder="6" />
          </View>
        </View>

        <CampoTexto
          etiqueta="Preço por garrafa (€)"
          valor={preco}
          onChange={setPreco}
          placeholder="38"
        />

        <Pressable
          onPress={() => setNatural((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: natural }}
          style={[estilos.natural, natural ? estilos.naturalActivo : null]}
        >
          <Text style={[estilos.naturalTexto, natural ? estilos.naturalTextoActivo : null]}>
            🌿 Vinho natural / baixa intervenção
          </Text>
          <Text style={estilos.naturalMarca}>{natural ? '✓' : ''}</Text>
        </Pressable>

        {erro ?? erroStore ? (
          <View style={estilos.erro} accessibilityLiveRegion="polite">
            <Text style={estilos.erroTexto}>{erro ?? erroStore}</Text>
          </View>
        ) : null}

        <Botao titulo="Adicionar à cave" onPress={guardar} ocupado={ocupado} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: Colors.cream.white },
  cabecalho: {
    backgroundColor: Colors.burgundy.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.md },
  titulo: {
    fontFamily: Typography.fonts.serifSemiBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.cream.white,
  },
  fechar: { fontSize: 22, color: Colors.cream.mid },
  conteudo: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  grupo: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  tipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  tipoActivo: { backgroundColor: Colors.burgundy.primary, borderColor: Colors.burgundy.primary },
  tipoEmoji: { fontSize: 15 },
  tipoTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  tipoTextoActivo: { color: Colors.cream.white },
  linha: { flexDirection: 'row', gap: Spacing.lg },
  meia: { flex: 1 },
  natural: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.cream.mid,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  naturalActivo: { backgroundColor: Colors.pureza.bg, borderColor: Colors.pureza.text },
  naturalTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
  },
  naturalTextoActivo: { color: Colors.pureza.text },
  naturalMarca: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.lg,
    color: Colors.pureza.text,
  },
  erro: {
    backgroundColor: Colors.status.dangerBg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  erroTexto: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: Colors.status.dangerText,
  },
});
