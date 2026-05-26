import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveOrg } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: user.id, organizationId: org.id },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(templates);
}
