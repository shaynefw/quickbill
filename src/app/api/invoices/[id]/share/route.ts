import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import crypto from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reuse existing token or generate a new one
  let token = invoice.shareToken;
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    await prisma.invoice.update({
      where: { id },
      data: { shareToken: token },
    });
  }

  return NextResponse.json({ token });
}
