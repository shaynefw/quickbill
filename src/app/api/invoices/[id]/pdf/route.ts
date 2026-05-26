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
    include: { items: true, client: true, organization: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Use the invoice's organization branding (fallback to legacy user fields)
  const org = invoice.organization;
  return NextResponse.json({
    invoice: {
      ...invoice,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paidAt: invoice.paidAt?.toISOString() || null,
    },
    user: {
      companyName: org?.companyName || user.companyName || user.fullName,
      companyEmail: org?.companyEmail || user.companyEmail,
      companyPhone: org?.companyPhone || user.companyPhone,
      companyAddress: org?.companyAddress || user.companyAddress,
      logoUrl: org?.logoUrl || user.logoUrl,
      primaryColor: org?.primaryColor || user.primaryColor || "#2563eb",
    },
  });
}
