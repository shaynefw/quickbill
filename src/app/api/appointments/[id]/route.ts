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

  const existing = await prisma.appointment.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || "",
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      location: data.location || "",
      status: data.status || "scheduled",
      clientId: data.clientId || null,
    },
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(appointment);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.appointment.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
