import { NextResponse } from "next/server";
import controller from "../../../../infra/controller";

// Chave pública VAPID: o front usa para criar a inscrição de push.
// (Serve de alternativa ao VITE_VAPID_PUBLIC_KEY embutido no front.)
async function getHandler() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ publicKey }, { status: 200 });
}

export const GET = controller.withErrorHandler(getHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
