import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveOrg } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  const items = await prisma.presetItem.findMany({
    where: { userId: user.id, organizationId: org.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  const data = await request.json();

  const item = await prisma.presetItem.create({
    data: {
      name: data.name,
      description: data.description,
      rate: data.rate,
      userId: user.id,
      organizationId: org.id,
    },
  });

  return NextResponse.json(item);
}
