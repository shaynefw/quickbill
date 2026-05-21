import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const items = await prisma.presetItem.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const data = await request.json();

  const item = await prisma.presetItem.create({
    data: {
      name: data.name,
      description: data.description,
      rate: data.rate,
      userId: user.id,
    },
  });

  return NextResponse.json(item);
}
