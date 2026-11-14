import webpush from "web-push";

/**
 * Configuração do Web Push (VAPID). As chaves vêm do ambiente:
 *   - VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (gere com `npx web-push generate-vapid-keys`)
 *   - VAPID_SUBJECT (um mailto: ou URL de contato)
 */
let configured = false;

function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@sync.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não definidas. Gere com 'npx web-push generate-vapid-keys'.",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Envia uma notificação push para uma inscrição. Lança em caso de falha. */
export async function sendPush(
  subscription: StoredSubscription,
  payload: unknown,
): Promise<void> {
  ensureConfigured();

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  );
}

/** 404/410 significam que a inscrição expirou e deve ser removida do banco. */
export function isSubscriptionGone(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number })?.statusCode;
  return statusCode === 404 || statusCode === 410;
}
