import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const data = await request.json();
  const client = await prisma.client.create({
    data: { ...data, userId: user.id },
  });
  return NextResponse.json(client);
}
