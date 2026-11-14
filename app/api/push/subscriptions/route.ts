import { NextRequest, NextResponse } from "next/server";
import controller from "../../../../infra/controller";
import pushSubscription from "../../../../src/models/pushSubscription";
import session from "../../../../app/models/session";

// Registra o aparelho atual para receber os lembretes de medicação.
async function postHandler(req: NextRequest) {
  const userId = await session.getUserId(req);
  const body = await req.json();
  const userAgent = req.headers.get("user-agent");
  const saved = await pushSubscription.save(userId, body, userAgent);
  return NextResponse.json(saved, { status: 201 });
}

// Para de notificar este aparelho (ao desativar ou sair).
async function deleteHandler(req: NextRequest) {
  const userId = await session.getUserId(req);
  const body = await req.json().catch(() => ({}));
  await pushSubscription.removeByEndpoint(userId, body?.endpoint);
  return new NextResponse(null, { status: 204 });
}

export const POST = controller.withErrorHandler(postHandler);
export const DELETE = controller.withErrorHandler(deleteHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
