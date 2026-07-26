/**
 * Notificações push.
 *
 * Só o I/O: pedir permissão, obter token, agendar. A decisão sobre *o que*
 * notificar está em `alertas.ts`, que é puro e testado.
 *
 * Nota: push notifications não funcionam em simulador nem em Expo Go a
 * partir do SDK 53 — é preciso development build em dispositivo físico.
 * É também o que a secção 17 do checklist assinala.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  type AlertaAgendado,
  alertasDeMaturacao,
  alertasDeUltimaChamada,
  proximoDigest,
  resumoDigest,
} from '@/lib/alertas';
import { supabase } from '@/lib/supabase';
import type { Wine } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Pede permissão e guarda o token Expo no perfil. Devolve `undefined` sem
 * permissão ou em emulador — não é erro, é ausência de capacidade.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Device.isDevice) return undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'VinhaVibe',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existente } = await Notifications.getPermissionsAsync();
  const status =
    existente === 'granted'
      ? existente
      : (await Notifications.requestPermissionsAsync()).status;

  if (status !== 'granted') return undefined;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();

    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase
        .from('user_settings')
        .update({ expo_push_token: token })
        .eq('id', auth.user.id);
    }

    return token;
  } catch {
    // Sem projectId configurado no EAS o token não é emitido. Não vale a
    // pena rebentar a app por causa disso.
    return undefined;
  }
}

async function agendar(alerta: AlertaAgendado): Promise<void> {
  const segundos = Math.round((alerta.quando.getTime() - Date.now()) / 1000);

  await Notifications.scheduleNotificationAsync({
    identifier: alerta.id,
    content: { title: alerta.titulo, body: alerta.corpo },
    trigger:
      segundos <= 0
        ? null
        : {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: segundos,
          },
  });
}

/**
 * Reagenda os alertas de maturação a partir do estado actual da cave.
 *
 * Cancela tudo antes de agendar: sem isso, cada arranque da app somaria
 * mais um conjunto de notificações às já pendentes.
 */
export async function scheduleMaturationAlerts(wines: Wine[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const alertas = [...alertasDeUltimaChamada(wines), ...alertasDeMaturacao(wines)];
  for (const a of alertas) {
    await agendar(a);
  }
}

export async function schedulePriceSpikeAlert(alerta: AlertaAgendado): Promise<void> {
  await agendar(alerta);
}

export async function scheduleWeeklyDigest(wines: Wine[]): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('digest-semanal').catch(() => {
    // Não existia — é o caso normal na primeira vez.
  });

  await agendar({
    id: 'digest-semanal',
    titulo: '📧 A tua semana em vinho',
    corpo: resumoDigest(wines),
    quando: proximoDigest(),
  });
}

export async function cancelarTodos(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
