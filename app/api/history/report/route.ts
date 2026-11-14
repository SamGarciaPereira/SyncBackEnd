import { NextRequest, NextResponse } from "next/server";
import controller from "../../../../infra/controller";
import history from "../../../../src/models/history";
import historyReport, {
  REPORT_MAX_EVENTS,
} from "../../../../src/models/historyReport";
import session from "../../../../app/models/session";
import { prisma } from "../../../../infra/prisma";
import { NotFoundError } from "../../../../infra/errors";

/**
 * Relatório em PDF do histórico do usuário logado.
 * Aceita os mesmos filtros de GET /history (type, from, to), sem paginação.
 */
async function getHandler(req: NextRequest) {
  const userId = await session.getUserId(req);
  const query = history.parseQuery(new URL(req.url).searchParams);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) {
    throw new NotFoundError({
      message: "Usuário não encontrado.",
      action: "Faça login novamente.",
    });
  }

  const generatedAt = new Date();
  const [summary, page] = await Promise.all([
    history.summary(userId),
    history.list(
      userId,
      { ...query, limit: REPORT_MAX_EVENTS, offset: 0 },
      generatedAt,
    ),
  ]);

  const pdf = await historyReport.build({
    userName: user.name,
    filter: query.type,
    from: query.from,
    to: query.to,
    generatedAt,
    summary,
    events: page.events,
    truncated: page.hasMore,
  });

  const fileDate = generatedAt.toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="historico-sync-${fileDate}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  });
}

export const GET = controller.withErrorHandler(getHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
