/**
 * Scan de etiquetas — a parte que fala com o mundo.
 *
 * O cliente só empacota a imagem e invoca a Edge Function `gemini-scan`. A
 * chave do Gemini é secret dessa função e nunca entra no bundle.
 *
 * Medido com chave real e gemini-2.5-flash: ~4,5 s por etiqueta. O ecrã tem
 * de assumir essa espera explicitamente, senão parece avariado.
 *
 * A normalização do que o modelo devolve está em `scan.ts`, para ser
 * testável — ver a nota lá.
 */

import * as ImagePicker from 'expo-image-picker';

import { normalizarScan, type RespostaScan } from '@/lib/scan';
import { invokeEdgeFunction } from '@/lib/supabase';
import type { Result, ScanResult } from '@/types';

export async function escolherImagem(
  origem: 'camara' | 'galeria',
): Promise<string | null> {
  const permissao =
    origem === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissao.granted) return null;

  const opcoes: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    base64: true,
    allowsEditing: false,
  };

  const r =
    origem === 'camara'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);

  if (r.canceled || !r.assets[0]) return null;
  return r.assets[0].base64 ?? null;
}

export async function scanWineLabel(
  imagemBase64: string,
): Promise<Result<ScanResult>> {
  const r = await invokeEdgeFunction<RespostaScan>('gemini-scan', {
    imagem_base64: imagemBase64,
    mime: 'image/jpeg',
  });

  if (!r.ok) {
    return {
      ok: false,
      error:
        'Não foi possível identificar a etiqueta. Verifica a ligação ou adiciona o vinho manualmente.',
    };
  }

  const normalizado = normalizarScan(r.data);

  // Sem produtor nem nome não há nada de útil para pré-preencher — mais vale
  // dizer que falhou do que abrir um formulário vazio a fingir que resultou.
  if (!normalizado.producer && !normalizado.name) {
    return {
      ok: false,
      error:
        'Não consegui ler esta etiqueta. Tenta uma foto mais próxima e sem reflexos, ou adiciona manualmente.',
    };
  }

  return { ok: true, data: normalizado };
}
