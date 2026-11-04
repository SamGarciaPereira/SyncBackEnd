import { prisma } from "../../infra/prisma";
import { ValidationError, NotFoundError } from "../../infra/errors";
import bcrypt from "bcryptjs";

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  birthDate?: string | Date | null;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  activatedAt?: Date | null;
}

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Campos que podem sair da API (nunca inclui a senha)
const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  birthDate: true,
  activatedAt: true,
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Valida a data de nascimento ("AAAA-MM-DD"): precisa ser uma data real,
 * no passado e depois de 1900.
 */
function parseBirthDate(value: string | Date): Date {
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(value);

  if (
    isNaN(date.getTime()) ||
    date > new Date() ||
    date < new Date("1900-01-01T00:00:00.000Z")
  ) {
    throw new ValidationError({
      message: "A data de nascimento ('birthDate') é inválida.",
      action: "Informe uma data real no formato AAAA-MM-DD (ex.: 1950-03-21).",
    });
  }

  return date;
}

async function create(userData: UserCreateInput) {
  const name = userData.name?.trim();
  const email = userData.email ? normalizeEmail(userData.email) : "";

  if (!name || !email || !userData.password) {
    throw new ValidationError({
      message: "Os campos 'name', 'email' e 'password' são obrigatórios.",
      action: "Certifique-se de que preencheu todos os dados necessários.",
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError({
      message: "O e-mail informado não é válido.",
      action: "Confira o e-mail digitado (ex.: maria@email.com).",
    });
  }

  if (userData.password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError({
      message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      action: "Escolha uma senha um pouco maior.",
    });
  }

  const birthDate = userData.birthDate
    ? parseBirthDate(userData.birthDate)
    : null;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ValidationError({
      message: "Este e-mail já se encontra registado no sistema.",
      action: "Utilize outro e-mail ou inicie sessão.",
    });
  }

  const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      birthDate,
    },
    select: PUBLIC_FIELDS,
  });

  return createdUser;
}

async function findById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: PUBLIC_FIELDS,
  });

  if (!user) {
    throw new NotFoundError({
      message: `Utilizador com o ID '${id}' não foi encontrado.`,
      action: "Verifique se o identificador informado está correto.",
    });
  }

  return user;
}

async function findByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

async function listAll() {
  return await prisma.user.findMany({
    select: PUBLIC_FIELDS,
  });
}

async function update(id: number, updateData: UserUpdateInput) {
  await findById(id);

  const dataToUpdate: Record<string, unknown> = { ...updateData };

  if (updateData.password) {
    dataToUpdate.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
  }

  return await prisma.user.update({
    where: { id },
    data: dataToUpdate,
    select: PUBLIC_FIELDS,
  });
}

async function activate(id: number) {
  await findById(id);

  return await prisma.user.update({
    where: { id },
    data: {
      activatedAt: new Date(),
    },
    select: PUBLIC_FIELDS,
  });
}

const user = {
  create,
  findById,
  findByEmail,
  listAll,
  update,
  activate,
};

export default user;
