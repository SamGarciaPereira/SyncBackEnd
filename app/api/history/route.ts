import { NextRequest, NextResponse } from "next/server";
import controller from "../../../infra/controller";
import history from "../../../src/models/history";
import session from "../../../app/models/session";

/**
 * Histórico do usuário logado: resumo (última dose, último alarme, última
 * ligação SOS) + linha do tempo filtrada.
 *
 * Query: type=all|doses|alarms|sos|finished, from, to (datas ISO), limit, offset.
 *
 * TODO(SOS): quando o botão SOS existir, ele precisa gravar um ActivityEvent
 * com type "SOS_CALL" — o resumo e o filtro "sos" passam a funcionar sozinhos.
 */
async function getHandler(req: NextRequest) {
  const userId = await session.getUserId(req);
  const query = history.parseQuery(new URL(req.url).searchParams);

  const [summary, page] = await Promise.all([
    history.summary(userId),
    history.list(userId, query),
  ]);

  return NextResponse.json({ summary, ...page }, { status: 200 });
}

export const GET = controller.withErrorHandler(getHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
