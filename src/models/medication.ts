
import { prisma } from "../../infra/prisma";
import { ValidationError, NotFoundError } from "../../infra/errors";
import { MedicationForm, DosageUnit } from "@/generated/prisma/client";
import { MEDICATION_CATALOG } from "./medicationCatalog";

export interface ScheduleInput {
  time: string; // "HH:mm"
  daysOfWeek?: number[];
}

export interface MedicationCreateInput {
  userId: number;
  catalogId?: number;
  customName?: string;
  nickname?: string;
  form?: MedicationForm;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  isConditional?: boolean;
  conditionRule?: string;
  startDate?: string | Date;
  endDate?: string | Date | null;
  notes?: string;
  visualDescription?: string;
  currentStock?: number;
  minStockAlert?: number;
  alertsEnabled?: boolean;
  schedules?: ScheduleInput[];
}

export interface MedicationUpdateInput extends Partial<MedicationCreateInput> {
  isActive?: boolean;
}

const FORM_CONSTRAINTS: Record<
  MedicationForm,
  {
    allowedUnits: DosageUnit[];
    allowsFraction: boolean;
    requiresScheduleByDefault: boolean;
  }
> = {
  TABLET: {
    allowedUnits: ["PILULA", "MG"],
    allowsFraction: true,
    requiresScheduleByDefault: true,
  },
  CAPSULE: {
    allowedUnits: ["PILULA", "MG"],
    allowsFraction: false,
    requiresScheduleByDefault: true,
  },
  DROPS: {
    allowedUnits: ["GOTAS", "ML"],
    allowsFraction: false,
    requiresScheduleByDefault: true,
  },
  LIQUID: {
    allowedUnits: ["ML", "MG"],
    allowsFraction: true,
    requiresScheduleByDefault: true,
  },
  INJECTION: {
    allowedUnits: ["UI", "ML", "MG", "APLICACAO"],
    allowsFraction: true,
    requiresScheduleByDefault: true,
  },
  INHALER: {
    allowedUnits: ["JATO", "APLICACAO"],
    allowsFraction: false,
    requiresScheduleByDefault: false,
  },
  TOPICAL: {
    allowedUnits: ["APLICACAO", "MG"],
    allowsFraction: false,
    requiresScheduleByDefault: false,
  },
  PATCH: {
    allowedUnits: ["APLICACAO", "MG"],
    allowsFraction: false,
    requiresScheduleByDefault: true,
  },
};

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

async function searchCatalog(query: string) {
  const cleanQuery = query?.trim() || "";

  const items = await prisma.medicationCatalog.findMany({
    where: cleanQuery
      ? {
          OR: [
            { name: { contains: cleanQuery } },
            { activeIngredient: { contains: cleanQuery } },
          ],
        }
      : undefined,
    take: 15,
    orderBy: { name: "asc" },
  });

  return items.map((item) => {
    const defaultConstraints = FORM_CONSTRAINTS[item.form];
    return {
      ...item,
      uiConfig: {
        allowedUnits: Array.isArray(item.allowedUnits)
          ? item.allowedUnits
          : defaultConstraints.allowedUnits,
        allowsSplitting: item.allowsSplitting,
        lockFormSelection: true, // Como veio do catálogo, trava a troca de forma
        showStockInUnitsOf: item.defaultUnit,
      },
    };
  });
}

async function create(data: MedicationCreateInput) {
  if (!data.userId) {
    throw new ValidationError({
      message: "O campo 'userId' é obrigatório.",
      action: "Informe o identificador do usuário/idoso.",
    });
  }

  const userExists = await prisma.user.findUnique({
    where: { id: Number(data.userId) },
  });

  if (!userExists) {
    throw new NotFoundError({
      message: `Usuário com o ID '${data.userId}' não foi encontrado.`,
      action: "Verifique se o usuário informado está cadastrado.",
    });
  }

  const resolved = await resolveMedicationData(data);

  // Persistência no banco criando o medicamento e seus horários em transação implícita
  const createdMedication = await prisma.medication.create({
    data: {
      userId: Number(data.userId),
      ...resolved.fields,
      schedules: {
        create: resolved.schedules,
      },
    },
    include: {
      catalogItem: true,
      schedules: true,
    },
  });

  return createdMedication;
}

/**
 * Aplica todas as regras de negócio (catálogo, forma x unidade, fracionamento,
 * uso condicional, horários e datas) e devolve os dados prontos para gravar.
 * Usada tanto no cadastro (create) quanto na edição (update).
 */
async function resolveMedicationData(data: MedicationCreateInput) {
  let resolvedName = data.customName?.trim();
  let resolvedForm = data.form;
  let allowedUnitsForMedication: DosageUnit[] = [];
  let allowsFraction = true;

  // 1. Se enviou catalogId, herda e valida contra as propriedades do medicamento no banco
  if (data.catalogId) {
    const catalogItem = await prisma.medicationCatalog.findUnique({
      where: { id: Number(data.catalogId) },
    });

    if (!catalogItem) {
      throw new NotFoundError({
        message: "O medicamento selecionado no catálogo não foi encontrado.",
        action:
          "Selecione um medicamento válido da lista ou cadastre manualmente.",
      });
    }

    resolvedName = resolvedName || catalogItem.name;
    resolvedForm = catalogItem.form;
    allowedUnitsForMedication =
      (catalogItem.allowedUnits as DosageUnit[]) ||
      FORM_CONSTRAINTS[catalogItem.form].allowedUnits;
    allowsFraction = catalogItem.allowsSplitting;
  } else {
    // 2. Cadastro manual: exige nome e forma farmacêutica
    if (!resolvedName || !resolvedForm) {
      throw new ValidationError({
        message:
          "Para medicamentos fora do catálogo, 'customName' e 'form' são obrigatórios.",
        action: "Informe o nome do medicamento e sua forma farmacêutica.",
      });
    }

    const constraints = FORM_CONSTRAINTS[resolvedForm];
    if (!constraints) {
      throw new ValidationError({
        message: `Forma farmacêutica '${resolvedForm}' inválida.`,
        action:
          "Utilize uma forma válida (ex: TABLET, CAPSULE, DROPS, LIQUID).",
      });
    }

    allowedUnitsForMedication = constraints.allowedUnits;
    allowsFraction = constraints.allowsFraction;
  }

  // 3. Validação inteligente de Dosagem e Unidade compatível com o Tipo de Medicamento
  if (data.dosageAmount === undefined || data.dosageAmount <= 0) {
    throw new ValidationError({
      message: "A dosagem ('dosageAmount') deve ser um número maior que zero.",
      action: "Informe a quantidade correta a ser administrada.",
    });
  }

  if (
    !data.dosageUnit ||
    !allowedUnitsForMedication.includes(data.dosageUnit)
  ) {
    throw new ValidationError({
      message: `A unidade '${data.dosageUnit}' não é compatível com a forma '${resolvedForm}'.`,
      action: `Unidades permitidas para este medicamento: ${allowedUnitsForMedication.join(", ")}.`,
    });
  }

  // Verifica se tentou partir um medicamento que não permite fração (ex: 0.5 cápsula ou 1.5 gotas)
  if (
    !allowsFraction &&
    data.dosageUnit === "PILULA" &&
    !Number.isInteger(data.dosageAmount)
  ) {
    throw new ValidationError({
      message: `Este medicamento (${resolvedName}) não pode ser fracionado/partido.`,
      action:
        "Informe uma dosagem inteira (ex: 1, 2) para este tipo de medicamento.",
    });
  }

  // 4. Validação de Uso Condicional ("Se necessário") vs Horários Fixos
  const isConditional = Boolean(data.isConditional);

  if (isConditional && (!data.conditionRule || !data.conditionRule.trim())) {
    throw new ValidationError({
      message:
        "Medicamentos de uso condicional ('se necessário') exigem a descrição da condição de uso.",
      action:
        "Preencha o campo 'conditionRule' (ex: 'Em caso de febre acima de 37.8°C').",
    });
  }

  if (!isConditional && (!data.schedules || data.schedules.length === 0)) {
    throw new ValidationError({
      message:
        "Medicamentos de uso contínuo/rotina exigem pelo menos um horário.",
      action:
        "Adicione ao menos um horário no campo 'schedules' ou marque como uso condicional.",
    });
  }

  // 5. Validação do formato dos horários (HH:mm) e dias da semana
  const formattedSchedules = (data.schedules || []).map((schedule) => {
    if (!TIME_REGEX.test(schedule.time)) {
      throw new ValidationError({
        message: `O horário '${schedule.time}' está em um formato inválido.`,
        action:
          "Utilize o formato 24h 'HH:mm' (ex: '08:00', '14:30', '22:00').",
      });
    }

    const days = schedule.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
    const invalidDay = days.some((d) => d < 0 || d > 6 || !Number.isInteger(d));
    if (invalidDay || days.length === 0) {
      throw new ValidationError({
        message:
          "Os dias da semana ('daysOfWeek') devem conter valores entre 0 (Domingo) e 6 (Sábado).",
        action: "Ajuste os dias da semana selecionados para o horário.",
      });
    }

    return {
      time: schedule.time,
      daysOfWeek: days,
    };
  });

  // 6. Validação de Datas
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  if (isNaN(startDate.getTime())) {
    throw new ValidationError({
      message: "A data de início ('startDate') é inválida.",
      action: "Informe uma data válida no formato ISO-8601.",
    });
  }

  let endDate: Date | null = null;
  if (data.endDate) {
    endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime()) || endDate < startDate) {
      throw new ValidationError({
        message:
          "A data de término ('endDate') é inválida ou anterior à data de início.",
        action: "Verifique o período de tratamento informado.",
      });
    }
  }

  return {
    fields: {
      catalogId: data.catalogId ? Number(data.catalogId) : null,
      customName: resolvedName,
      nickname: data.nickname?.trim() || null,
      form: resolvedForm,
      dosageAmount: Number(data.dosageAmount),
      dosageUnit: data.dosageUnit,
      isConditional,
      conditionRule: isConditional ? data.conditionRule?.trim() : null,
      startDate,
      endDate,
      notes: data.notes?.trim() || null,
      visualDescription: data.visualDescription?.trim() || null,
      currentStock:
        data.currentStock !== undefined ? Number(data.currentStock) : 0,
      minStockAlert:
        data.minStockAlert !== undefined ? Number(data.minStockAlert) : 5,
      alertsEnabled: data.alertsEnabled ?? true,
    },
    schedules: formattedSchedules,
  };
}

/**
 * Valida um identificador vindo da URL (path ou query string).
 */
function parseId(value: string | null | undefined, field = "id"): number {
  const parsed = Number(value);

  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError({
      message: `O parâmetro '${field}' é obrigatório e deve ser um número inteiro positivo.`,
      action: `Informe um '${field}' válido (ex: 1).`,
    });
  }

  return parsed;
}

async function listAll(userId: number, includeInactive = false) {
  return await prisma.medication.findMany({
    where: {
      userId: Number(userId),
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      catalogItem: true,
      schedules: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Busca um medicamento. Com `userId`, só encontra se pertencer a esse usuário
 * (medicamento de outra pessoa responde 404, sem revelar que existe).
 */
async function findById(id: number, userId?: number) {
  const med = await prisma.medication.findUnique({
    where: { id: Number(id) },
    include: {
      catalogItem: true,
      schedules: true,
    },
  });

  if (!med || (userId !== undefined && med.userId !== userId)) {
    throw new NotFoundError({
      message: `Medicamento com o ID '${id}' não foi encontrado.`,
      action: "Verifique se o identificador informado está correto.",
    });
  }

  return med;
}

/**
 * Atualização parcial: mescla os campos enviados com o registro atual e
 * revalida tudo com as mesmas regras do cadastro. Se 'schedules' for enviado,
 * substitui todos os horários do medicamento.
 */
async function update(
  id: number,
  data: MedicationUpdateInput,
  userId?: number,
) {
  const existing = await findById(id, userId);

  const merged: MedicationCreateInput = {
    userId: existing.userId, // o dono do medicamento não muda
    catalogId: data.catalogId ?? existing.catalogId ?? undefined,
    customName: data.customName ?? existing.customName,
    nickname: data.nickname ?? existing.nickname ?? undefined,
    form: data.form ?? existing.form,
    dosageAmount: data.dosageAmount ?? existing.dosageAmount,
    dosageUnit: data.dosageUnit ?? existing.dosageUnit,
    isConditional: data.isConditional ?? existing.isConditional,
    conditionRule: data.conditionRule ?? existing.conditionRule ?? undefined,
    startDate: data.startDate ?? existing.startDate,
    endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
    notes: data.notes ?? existing.notes ?? undefined,
    visualDescription:
      data.visualDescription ?? existing.visualDescription ?? undefined,
    currentStock: data.currentStock ?? existing.currentStock,
    minStockAlert: data.minStockAlert ?? existing.minStockAlert,
    alertsEnabled: data.alertsEnabled ?? existing.alertsEnabled,
    schedules:
      data.schedules ??
      existing.schedules.map((schedule) => ({
        time: schedule.time,
        daysOfWeek: schedule.daysOfWeek as unknown as number[],
      })),
  };

  const resolved = await resolveMedicationData(merged);

  return await prisma.medication.update({
    where: { id: existing.id },
    data: {
      ...resolved.fields,
      ...(data.isActive !== undefined
        ? { isActive: Boolean(data.isActive) }
        : {}),
      schedules: {
        deleteMany: {},
        create: resolved.schedules,
      },
    },
    include: {
      catalogItem: true,
      schedules: true,
    },
  });
}

/**
 * Remoção lógica (soft delete): o medicamento sai da lista do usuário,
 * mas o registro é mantido para o histórico de doses.
 */
async function remove(id: number, userId?: number) {
  const existing = await findById(id, userId);

  return await prisma.medication.update({
    where: { id: existing.id },
    data: { isActive: false },
    include: {
      catalogItem: true,
      schedules: true,
    },
  });
}

/**
 * Adiciona ao catálogo os medicamentos que ainda não existem.
 * Mantém os registros já cadastrados no banco de dados.
 */
let catalogSeedPromise: Promise<void> | undefined;

async function ensureCatalogSeeded() {
  if (!catalogSeedPromise) {
    catalogSeedPromise = seedMissingCatalogEntries().catch((error) => {
      catalogSeedPromise = undefined;
      throw error;
    });
  }

  return catalogSeedPromise;
}

async function seedMissingCatalogEntries() {
  const existing = await prisma.medicationCatalog.findMany({
    select: { name: true },
  });

  const names = new Set(
    existing.map((item) =>
      item.name.trim().toLocaleLowerCase("pt-BR")
    )
  );

  const missing = MEDICATION_CATALOG.filter(
    (item) =>
      !names.has(
        item.name.trim().toLocaleLowerCase("pt-BR")
      )
  );

  if (missing.length > 0) {
    await prisma.medicationCatalog.createMany({
      data: missing,
    });
  }
}

const medication = {
  create,
  listAll,
  findById,
  update,
  remove,
  parseId,
  searchCatalog,
  ensureCatalogSeeded,
};

export default medication;
