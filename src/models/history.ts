import { prisma } from "../../infra/prisma";
import { ValidationError } from "../../infra/errors";
import { UNIT_LABELS } from "./reminder";
import type { DosageUnit } from "@/generated/prisma/client";

/** Filtros aceitos em `?type=` (o padrão é "all"). */
export const HISTORY_FILTERS = [
  "all",
  "doses",
  "alarms",
  "sos",
  "finished",
] as const;
export type HistoryFilter = (typeof HISTORY_FILTERS)[number];

export type HistoryEventType =
  | "DOSE_TAKEN"
  | "ALARM"
  | "SOS_CALL"
  | "MEDICATION_FINISHED";

/** Por que o medicamento aparece como terminado. */
export type FinishedReason = "COMPLETED" | "REMOVED";

export interface HistoryEvent {
  /** Único na linha do tempo (ex.: "dose-12", "alarm-4", "finished-7"). */
  id: string;
  type: HistoryEventType;
  occurredAt: Date;
  medicationId: number | null;
  medicationName: string | null;
  dosageLabel: string | null;
  scheduledTime: string | null; // "HH:mm" do lembrete, quando houver
  finishedReason: FinishedReason | null; // só em MEDICATION_FINISHED
}

export interface HistorySummaryItem {
  occurredAt: Date;
  medicationName: string | null;
  scheduledTime: string | null;
}

export interface HistorySummary {
  lastDose: HistorySummaryItem | null;
  lastAlarm: HistorySummaryItem | null;
  /** Sempre null até o botão SOS existir e passar a gravar `SOS_CALL`. */
  lastSos: HistorySummaryItem | null;
}

export interface HistoryQuery {
  type: HistoryFilter;
  from: Date | null;
  to: Date | null;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parseDate(value: string | null, field: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError({
      message: `O parâmetro '${field}' não é uma data válida.`,
      action: `Informe '${field}' no formato ISO (ex: 2026-11-14T00:00:00.000Z).`,
    });
  }
  return date;
}

function parseInteger(
  value: string | null,
  field: string,
  fallback: number,
  min: number,
): number {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new ValidationError({
      message: `O parâmetro '${field}' deve ser um número inteiro maior ou igual a ${min}.`,
      action: `Informe um '${field}' válido.`,
    });
  }
  return parsed;
}

/** Lê e valida os filtros da query string (`type`, `from`, `to`, `limit`, `offset`). */
function parseQuery(searchParams: URLSearchParams): HistoryQuery {
  const type = (searchParams.get("type") || "all") as HistoryFilter;
  if (!HISTORY_FILTERS.includes(type)) {
    throw new ValidationError({
      message: `O filtro '${type}' não existe.`,
      action: `Use um destes valores em 'type': ${HISTORY_FILTERS.join(", ")}.`,
    });
  }

  const from = parseDate(searchParams.get("from"), "from");
  const to = parseDate(searchParams.get("to"), "to");
  if (from && to && from > to) {
    throw new ValidationError({
      message: "O início do período é posterior ao fim.",
      action: "Informe 'from' anterior a 'to'.",
    });
  }

  const limit = Math.min(
    parseInteger(searchParams.get("limit"), "limit", DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = parseInteger(searchParams.get("offset"), "offset", 0, 0);

  return { type, from, to, limit, offset };
}

type MedicationInfo = {
  id: number;
  nickname: string | null;
  customName: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
};

const medicationSelect = {
  id: true,
  nickname: true,
  customName: true,
  dosageAmount: true,
  dosageUnit: true,
} as const;

function medicationName(med: MedicationInfo | null) {
  return med ? med.nickname || med.customName : null;
}

function dosageLabel(med: MedicationInfo | null) {
  if (!med) return null;
  return `${med.dosageAmount.toLocaleString("pt-BR")} ${UNIT_LABELS[med.dosageUnit]}`;
}

function dateRange(from: Date | null, to: Date | null) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

async function doseEvents(
  userId: number,
  from: Date | null,
  to: Date | null,
  take: number,
): Promise<HistoryEvent[]> {
  const rows = await prisma.doseEvent.findMany({
    where: { userId, status: "TAKEN", takenAt: dateRange(from, to) },
    include: { medication: { select: medicationSelect } },
    orderBy: { takenAt: "desc" },
    take,
  });

  return rows.map((row) => ({
    id: `dose-${row.id}`,
    type: "DOSE_TAKEN",
    occurredAt: row.takenAt,
    medicationId: row.medicationId,
    medicationName: medicationName(row.medication),
    dosageLabel: dosageLabel(row.medication),
    scheduledTime: row.scheduledTime,
    finishedReason: null,
  }));
}

async function activityEvents(
  userId: number,
  type: "ALARM" | "SOS_CALL",
  from: Date | null,
  to: Date | null,
  take: number,
): Promise<HistoryEvent[]> {
  const rows = await prisma.activityEvent.findMany({
    where: { userId, type, occurredAt: dateRange(from, to) },
    include: { medication: { select: medicationSelect } },
    orderBy: { occurredAt: "desc" },
    take,
  });

  return rows.map((row) => ({
    id: `${type === "ALARM" ? "alarm" : "sos"}-${row.id}`,
    type,
    occurredAt: row.occurredAt,
    medicationId: row.medicationId,
    medicationName: medicationName(row.medication),
    dosageLabel: dosageLabel(row.medication),
    scheduledTime: row.scheduledTime,
    finishedReason: null,
  }));
}

/**
 * Medicamentos terminados, em dois casos com rótulos diferentes:
 * - REMOVED: o usuário removeu da lista (isActive = false); a data é a da remoção.
 * - COMPLETED: o tratamento chegou ao fim (endDate no passado); a data é o endDate.
 */
async function finishedEvents(
  userId: number,
  from: Date | null,
  to: Date | null,
  take: number,
  now: Date,
): Promise<HistoryEvent[]> {
  const completedRange = {
    lt: now,
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };

  const rows = await prisma.medication.findMany({
    where: {
      userId,
      OR: [
        { isActive: false, updatedAt: dateRange(from, to) },
        { isActive: true, endDate: completedRange },
      ],
    },
    select: {
      ...medicationSelect,
      isActive: true,
      endDate: true,
      updatedAt: true,
    },
  });

  return rows
    .map((med): HistoryEvent => {
      const removed = !med.isActive;
      return {
        id: `finished-${med.id}`,
        type: "MEDICATION_FINISHED",
        // endDate nunca é null aqui: sem remoção, o filtro exige endDate preenchido.
        occurredAt: removed ? med.updatedAt : (med.endDate ?? med.updatedAt),
        medicationId: med.id,
        medicationName: medicationName(med),
        dosageLabel: dosageLabel(med),
        scheduledTime: null,
        finishedReason: removed ? "REMOVED" : "COMPLETED",
      };
    })
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, take);
}

/**
 * Linha do tempo unificada (mais recente primeiro), já filtrada e paginada.
 * Cada fonte devolve no máximo `offset + limit + 1` itens — o suficiente para
 * montar a página pedida depois de juntar e ordenar tudo.
 */
async function list(
  userId: number,
  query: HistoryQuery,
  now: Date = new Date(),
) {
  const { type, from, to, limit, offset } = query;
  const take = offset + limit + 1;
  const wants = (filter: HistoryFilter) => type === "all" || type === filter;

  const sources = await Promise.all([
    wants("doses") ? doseEvents(userId, from, to, take) : [],
    wants("alarms") ? activityEvents(userId, "ALARM", from, to, take) : [],
    wants("sos") ? activityEvents(userId, "SOS_CALL", from, to, take) : [],
    wants("finished") ? finishedEvents(userId, from, to, take, now) : [],
  ]);

  const merged = sources
    .flat()
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return {
    events: merged.slice(offset, offset + limit),
    hasMore: merged.length > offset + limit,
  };
}

/** Últimos registros de cada tipo — não depende dos filtros da listagem. */
async function summary(userId: number): Promise<HistorySummary> {
  const [lastDose, lastAlarm, lastSos] = await Promise.all([
    doseEvents(userId, null, null, 1),
    activityEvents(userId, "ALARM", null, null, 1),
    activityEvents(userId, "SOS_CALL", null, null, 1),
  ]);

  const pick = (events: HistoryEvent[]): HistorySummaryItem | null =>
    events[0]
      ? {
          occurredAt: events[0].occurredAt,
          medicationName: events[0].medicationName,
          scheduledTime: events[0].scheduledTime,
        }
      : null;

  return {
    lastDose: pick(lastDose),
    lastAlarm: pick(lastAlarm),
    lastSos: pick(lastSos),
  };
}

const history = {
  parseQuery,
  list,
  summary,
};

export default history;
