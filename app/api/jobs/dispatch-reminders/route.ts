import { NextRequest, NextResponse } from "next/server";
import controller from "../../../../infra/controller";
import reminder from "../../../../src/models/reminder";
import { UnauthorizedError } from "../../../../infra/errors";

/**
 * Dispara os lembretes das doses que vencem neste minuto.
 * Não é uma rota pública: o worker (infra/scripts/reminders-worker.js) chama
 * a cada minuto enviando o header `x-cron-secret` com o valor de CRON_SECRET.
 */
async function postHandler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    throw new UnauthorizedError({
      message: "Gatilho de lembretes não autorizado.",
      action: "Configure o CRON_SECRET e envie o header x-cron-secret.",
    });
  }

  const result = await reminder.dispatchDue();
  return NextResponse.json(result, { status: 200 });
}

export const POST = controller.withErrorHandler(postHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
