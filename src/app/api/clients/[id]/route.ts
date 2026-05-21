import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const data = await request.json();
  const client = await prisma.client.updateMany({
    where: { id, userId: user.id },
    data,
  });
  return NextResponse.json(client);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  await prisma.client.deleteMany({
    where: { id, userId: user.id },
  });
  return NextResponse.json({ success: true });
}
