import { prisma } from "../../infra/prisma";
import { sendPush, isSubscriptionGone } from "../../infra/webpush";
import type { DosageUnit } from "@/generated/prisma/client";

/** Rótulo curto da unidade, para o corpo da notificação e o histórico. */
export const UNIT_LABELS: Record<DosageUnit, string> = {
  PILULA: "comprimido(s)",
  MG: "mg",
  ML: "ml",
  GOTAS: "gota(s)",
  UI: "UI",
  JATO: "jato(s)",
  APLICACAO: "aplicação(ões)",
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DEFAULT_TZ = process.env.REMINDER_TZ || "America/Sao_Paulo";

/** Hora "HH:mm" e dia da semana (0=Dom..6=Sáb) no fuso configurado. */
function clockInTimezone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hhmm = `${get("hour")}:${get("minute")}`;
  const weekday = WEEKDAY_INDEX[get("weekday")];
  return { hhmm, weekday };
}

function buildPayload(
  med: { id: number; nickname: string | null; customName: string; dosageAmount: number; dosageUnit: DosageUnit },
  hhmm: string,
) {
  const name = med.nickname || med.customName;
  const dose = `${med.dosageAmount.toLocaleString("pt-BR")} ${UNIT_LABELS[med.dosageUnit]}`;

  return {
    title: "Hora do seu remédio 💊",
    body: `${name} — ${dose}`,
    medicationId: med.id,
    scheduledTime: hhmm,
    // Base da própria API, para o botão "Tomei" do service worker confirmar a dose.
    apiBase: process.env.PUBLIC_API_URL || "http://localhost:3001/api",
  };
}

export interface DispatchResult {
  time: string;
  weekday: number;
  medications: number;
  targets: number;
  sent: number;
  failed: number;
}

/**
 * Encontra as doses que vencem "agora" (hora + dia da semana no fuso) e envia
 * um push para cada aparelho inscrito do dono. Chamado a cada minuto pelo worker.
 */
async function dispatchDue(
  now: Date = new Date(),
  timeZone: string = DEFAULT_TZ,
): Promise<DispatchResult> {
  const { hhmm, weekday } = clockInTimezone(now, timeZone);

  // Fim do dia de hoje (hora local do servidor) para não cortar tratamentos que
  // terminam hoje por causa do horário gravado no endDate.
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const medications = await prisma.medication.findMany({
    where: {
      isActive: true,
      alertsEnabled: true,
      isConditional: false,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      schedules: { some: { time: hhmm } },
    },
    include: {
      schedules: true,
      user: { include: { pushSubscriptions: true } },
    },
  });

  let targets = 0;
  let sent = 0;
  let failed = 0;

  for (const med of medications) {
    const matches = med.schedules.some(
      (s) =>
        s.time === hhmm &&
        Array.isArray(s.daysOfWeek) &&
        (s.daysOfWeek as number[]).includes(weekday),
    );
    if (!matches) continue;

    // Registra o alarme no histórico, mesmo sem aparelho inscrito: com o app
    // aberto o aviso aparece na tela independentemente do push.
    await prisma.activityEvent
      .create({
        data: {
          userId: med.userId,
          medicationId: med.id,
          type: "ALARM",
          scheduledTime: hhmm,
          occurredAt: now,
        },
      })
      .catch((error) =>
        console.error("[reminder] falha ao registrar o alarme:", error),
      );

    const subscriptions = med.user.pushSubscriptions;
    if (subscriptions.length === 0) continue;

    const payload = buildPayload(med, hhmm);

    for (const subscription of subscriptions) {
      targets++;
      try {
        await sendPush(subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        if (isSubscriptionGone(error)) {
          // Inscrição expirada: remove para não tentar de novo.
          await prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => {});
        } else {
          console.error("[reminder] falha ao enviar push:", error);
        }
      }
    }
  }

  return { time: hhmm, weekday, medications: medications.length, targets, sent, failed };
}

const reminder = {
  dispatchDue,
  clockInTimezone,
};

export default reminder;
