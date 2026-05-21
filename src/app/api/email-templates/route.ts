import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: user.id },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(templates);
}
