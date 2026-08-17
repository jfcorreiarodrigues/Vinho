/**
 * Tradução das mensagens do Supabase para PT-PT.
 *
 * Vive à parte do `supabase.ts` para poder ser testado: aquele módulo importa
 * o cliente e o `react-native`, e nenhum dos dois carrega fora da app.
 */

/**
 * Estado da rede tal como o ambiente o consegue afirmar.
 *
 * `desconhecido` não é preguiça: no browser há `navigator.onLine`, em React
 * Native não há equivalente sem uma dependência extra. Fingir uma certeza que
 * não temos é como se chegou à mensagem que mandava o utilizador verificar a
 * internet quando o servidor é que estava em baixo.
 */
export type EstadoRede = 'online' | 'offline' | 'desconhecido';

/**
 * Um `fetch` falhado não distingue "não há rede" de "o servidor não
 * respondeu" — as duas situações dão o mesmo erro. A diferença importa para o
 * utilizador, porque a acção que resolve cada uma é oposta.
 */
export function mensagemDeLigacao(rede: EstadoRede): string {
  if (rede === 'offline') {
    return 'Sem ligação à internet. Verifica a rede e tenta outra vez.';
  }
  if (rede === 'online') {
    return 'O servidor não respondeu. A tua ligação está boa, por isso o problema é do nosso lado — tenta daqui a pouco.';
  }
  return 'Não foi possível chegar ao servidor. Verifica a ligação ou tenta daqui a pouco.';
}

export function traduzErro(
  error: { message?: string } | null,
  rede: EstadoRede = 'desconhecido',
): string {
  if (!error) return 'Ocorreu um erro inesperado.';

  const msg = error.message ?? '';

  if (msg.includes('LIMITE_PLANO_FREE')) {
    return 'O plano gratuito permite até 50 garrafas na cave. Faz upgrade para Premium para adicionares mais.';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Email ou palavra-passe incorrectos.';
  }
  if (msg.includes('User already registered')) {
    return 'Já existe uma conta com este email.';
  }
  if (msg.includes('Password should be at least')) {
    return 'A palavra-passe tem de ter pelo menos 6 caracteres.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Confirma o teu email antes de entrares.';
  }
  if (msg.includes('Unable to validate email address')) {
    return 'O endereço de email não é válido.';
  }
  if (msg.includes('duplicate key')) {
    return 'Este registo já existe.';
  }
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('NetworkError') ||
    msg.includes('fetch failed')
  ) {
    return mensagemDeLigacao(rede);
  }

  return 'Não foi possível completar a operação. Tenta novamente.';
}
