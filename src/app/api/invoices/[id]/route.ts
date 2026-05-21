import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const data = await request.json();

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

  const invoice = await prisma.invoice.updateMany({
    where: { id, userId: user.id },
    data: {
      invoiceNumber: data.invoiceNumber,
      clientId: data.clientId,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      taxRate: data.taxRate,
      notes: data.notes || "",
      subtotal: data.subtotal,
      discountType: data.discountType || "none",
      discountValue: data.discountValue || 0,
      discountAmount: data.discountAmount || 0,
      taxAmount: data.taxAmount,
      total: data.total,
      status: data.status || "draft",
    },
  });

  await prisma.invoiceItem.createMany({
    data: data.items.map(
      (item: {
        description: string;
        quantity: number;
        rate: number;
        amount: number;
      }) => ({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })
    ),
  });

  return NextResponse.json(invoice);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const data = await request.json();

  const updateData: Record<string, unknown> = { status: data.status };
  if (data.status === "paid") updateData.paidAt = new Date();
  if (data.status === "sent") updateData.sentAt = new Date();
  // When undoing paid, clear paidAt
  if (data.status === "sent" && data.undoPaid) {
    updateData.paidAt = null;
  }

  await prisma.invoice.updateMany({
    where: { id, userId: user.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  await prisma.invoice.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
