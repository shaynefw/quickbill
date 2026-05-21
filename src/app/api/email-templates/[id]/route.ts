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

  await prisma.emailTemplate.updateMany({
    where: { id, userId: user.id },
    data: {
      subject: data.subject,
      body: data.body,
    },
  });

  return NextResponse.json({ success: true });
}
