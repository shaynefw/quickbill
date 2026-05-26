import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveOrg } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  const clients = await prisma.client.findMany({
    where: { userId: user.id, organizationId: org.id },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  const data = await request.json();
  const client = await prisma.client.create({
    data: { ...data, userId: user.id, organizationId: org.id },
  });
  return NextResponse.json(client);
}
