import { NextRequest, NextResponse } from "next/server";
import controller from "../../../infra/controller";
import authentication from "../../../app/models/authentication";
import session from "../../../app/models/session";

// Login: confere e-mail/senha e grava o cookie de sessão
async function postHandler(req: NextRequest) {
  const body = await req.json();
  const authenticatedUser = await authentication.login(
    body?.email,
    body?.password,
  );

  const token = await session.create(authenticatedUser.id);
  const response = NextResponse.json(authenticatedUser, { status: 201 });
  session.setCookie(response, token);

  return response;
}

// Logout: apaga o cookie de sessão
async function deleteHandler() {
  const response = new NextResponse(null, { status: 204 });
  session.clearCookie(response);

  return response;
}

export const POST = controller.withErrorHandler(postHandler);
export const DELETE = controller.withErrorHandler(deleteHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
