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

  await prisma.presetItem.updateMany({
    where: { id, userId: user.id },
    data: {
      name: data.name,
      description: data.description,
      rate: data.rate,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  await prisma.presetItem.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
