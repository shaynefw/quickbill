import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: {
    userId: string;
    startTime?: { gte?: Date; lte?: Date };
  } = { userId: user.id };
  if (from || to) {
    where.startTime = {};
    if (from) where.startTime.gte = new Date(from);
    if (to) where.startTime.lte = new Date(to);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const data = await request.json();

  const appointment = await prisma.appointment.create({
    data: {
      userId: user.id,
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
