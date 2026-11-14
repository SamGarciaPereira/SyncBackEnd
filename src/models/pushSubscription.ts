import { prisma } from "../../infra/prisma";
import { ValidationError } from "../../infra/errors";

/** Formato que o navegador envia (PushSubscription.toJSON()). */
export interface BrowserSubscriptionInput {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

function validate(sub: BrowserSubscriptionInput) {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new ValidationError({
      message: "Inscrição de notificação inválida.",
      action: "Ative as notificações novamente neste aparelho.",
    });
  }
}

/**
 * Salva (ou atualiza) a inscrição de um aparelho para o usuário logado.
 * A chave é o `endpoint`: reativar no mesmo aparelho atualiza o registro.
 */
async function save(
  userId: number,
  sub: BrowserSubscriptionInput,
  userAgent?: string | null,
) {
  validate(sub);

  const endpoint = sub.endpoint as string;
  const p256dh = sub.keys!.p256dh as string;
  const auth = sub.keys!.auth as string;

  return await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth, userAgent: userAgent ?? null },
    update: { userId, p256dh, auth, userAgent: userAgent ?? null },
  });
}

/** Remove a inscrição de um aparelho (ao desativar/sair). */
async function removeByEndpoint(userId: number, endpoint?: string) {
  if (!endpoint) {
    throw new ValidationError({
      message: "O 'endpoint' da inscrição é obrigatório.",
      action: "Envie o endpoint do aparelho a ser removido.",
    });
  }

  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

async function listByUser(userId: number) {
  return await prisma.pushSubscription.findMany({ where: { userId } });
}

const pushSubscription = {
  save,
  removeByEndpoint,
  listByUser,
};

export default pushSubscription;
