import { prisma } from "../../infra/prisma";
import { ValidationError, NotFoundError } from "../../infra/errors";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface RecordDoseInput {
  medicationId: number;
  scheduledTime?: string | null; // "HH:mm" do lembrete, quando houver
}

/** Confirma que uma dose foi tomada ("Tomei"). Só registra med. do próprio usuário. */
async function record(userId: number, data: RecordDoseInput) {
  const medicationId = Number(data.medicationId);

  if (!Number.isInteger(medicationId) || medicationId <= 0) {
    throw new ValidationError({
      message: "O 'medicationId' é obrigatório e deve ser um número válido.",
      action: "Informe o medicamento da dose confirmada.",
    });
  }

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
  });

  if (!medication || medication.userId !== userId) {
    throw new NotFoundError({
      message: `Medicamento com o ID '${medicationId}' não foi encontrado.`,
      action: "Verifique se o medicamento pertence a você.",
    });
  }

  const scheduledTime =
    data.scheduledTime && TIME_REGEX.test(data.scheduledTime)
      ? data.scheduledTime
      : null;

  return await prisma.doseEvent.create({
    data: { medicationId, userId, scheduledTime, status: "TAKEN" },
  });
}

/** Doses confirmadas pelo usuário em um intervalo (padrão: hoje). */
async function listTaken(userId: number, from: Date, to: Date) {
  return await prisma.doseEvent.findMany({
    where: {
      userId,
      status: "TAKEN",
      takenAt: { gte: from, lte: to },
    },
    orderBy: { takenAt: "desc" },
  });
}

const dose = {
  record,
  listTaken,
};

export default dose;
