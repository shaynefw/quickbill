import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { items: true, client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return invoice data as JSON for client-side PDF generation
  return NextResponse.json({
    invoice: {
      ...invoice,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
    },
    user: {
      companyName: user.companyName || user.fullName,
      companyEmail: user.companyEmail,
      companyPhone: user.companyPhone,
      companyAddress: user.companyAddress,
      logoUrl: user.logoUrl,
      primaryColor: user.primaryColor || "#2563eb",
    },
  });
}
