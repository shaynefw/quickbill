import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await requireUser();
  const data = await request.json();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      clientId: data.clientId,
      userId: user.id,
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
      sentAt: data.status === "sent" ? new Date() : null,
      items: {
        create: data.items.map(
          (item: {
            description: string;
            quantity: number;
            rate: number;
            amount: number;
          }) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })
        ),
      },
    },
  });

  return NextResponse.json(invoice);
}
