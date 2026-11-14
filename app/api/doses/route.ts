import { NextRequest, NextResponse } from "next/server";
import controller from "../../../infra/controller";
import dose from "../../../src/models/dose";
import session from "../../../app/models/session";

// Doses que o usuário já confirmou hoje (para a tela de Lembretes marcar o que foi tomado).
async function getHandler(req: NextRequest) {
  const userId = await session.getUserId(req);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const taken = await dose.listTaken(userId, startOfDay, endOfDay);
  return NextResponse.json(taken, { status: 200 });
}

// Confirma uma dose ("Tomei"): { medicationId, scheduledTime? }
async function postHandler(req: NextRequest) {
  const userId = await session.getUserId(req);
  const body = await req.json();
  const created = await dose.record(userId, body);
  return NextResponse.json(created, { status: 201 });
}

export const GET = controller.withErrorHandler(getHandler);
export const POST = controller.withErrorHandler(postHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
