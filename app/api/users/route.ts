
import { NextRequest, NextResponse } from "next/server";
import controller from "../../../infra/controller";
import user from "../../../app/models/user";

async function postHandler(req: NextRequest) {
  const body = await req.json();
  const createdUser = await user.create(body);

  const response = NextResponse.json(createdUser, { status: 201 });

  return response;
}

export const POST = controller.withErrorHandler(postHandler);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
