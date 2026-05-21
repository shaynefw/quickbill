import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET: Export backup data
export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const sections = url.searchParams.get("sections")?.split(",") || [
    "clients",
    "invoices",
    "presets",
  ];

  const backup: Record<string, unknown> = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sections,
  };

  if (sections.includes("clients")) {
    backup.clients = await prisma.client.findMany({
      where: { userId: user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        company: true,
        notes: true,
      },
    });
  }

  if (sections.includes("invoices")) {
    const invoices = await prisma.invoice.findMany({
      where: { userId: user.id },
      include: { items: true, client: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });
    backup.invoices = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      notes: inv.notes,
      subtotal: inv.subtotal,
      discountType: inv.discountType,
      discountValue: inv.discountValue,
      discountAmount: inv.discountAmount,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      total: inv.total,
      paidAt: inv.paidAt?.toISOString() || null,
      sentAt: inv.sentAt?.toISOString() || null,
      clientEmail: inv.client.email,
      items: inv.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })),
    }));
  }

  if (sections.includes("presets")) {
    backup.presets = await prisma.presetItem.findMany({
      where: { userId: user.id },
      select: {
        name: true,
        description: true,
        rate: true,
      },
    });
  }

  return NextResponse.json(backup);
}

// POST: Import backup data
export async function POST(request: Request) {
  const user = await requireUser();
  const backup = await request.json();

  if (!backup || backup.version !== 1) {
    return NextResponse.json(
      { error: "Invalid backup file format" },
      { status: 400 }
    );
  }

  const results: Record<string, number> = {};

  // Import clients
  if (backup.clients && Array.isArray(backup.clients)) {
    let imported = 0;
    for (const client of backup.clients) {
      // Skip if a client with same email already exists
      const existing = await prisma.client.findFirst({
        where: { userId: user.id, email: client.email },
      });
      if (!existing) {
        await prisma.client.create({
          data: {
            userId: user.id,
            name: client.name || "",
            email: client.email || "",
            phone: client.phone || "",
            address: client.address || "",
            company: client.company || "",
            notes: client.notes || "",
          },
        });
        imported++;
      }
    }
    results.clients = imported;
  }

  // Import invoices
  if (backup.invoices && Array.isArray(backup.invoices)) {
    let imported = 0;
    for (const inv of backup.invoices) {
      // Check if invoice number already exists
      const existingInv = await prisma.invoice.findFirst({
        where: { userId: user.id, invoiceNumber: inv.invoiceNumber },
      });
      if (existingInv) continue;

      // Find or create client by email
      let client = await prisma.client.findFirst({
        where: { userId: user.id, email: inv.clientEmail },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            userId: user.id,
            name: inv.clientEmail?.split("@")[0] || "Unknown",
            email: inv.clientEmail || "",
          },
        });
      }

      await prisma.invoice.create({
        data: {
          userId: user.id,
          clientId: client.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status || "draft",
          issueDate: new Date(inv.issueDate),
          dueDate: new Date(inv.dueDate),
          notes: inv.notes || "",
          subtotal: inv.subtotal || 0,
          discountType: inv.discountType || "none",
          discountValue: inv.discountValue || 0,
          discountAmount: inv.discountAmount || 0,
          taxRate: inv.taxRate || 0,
          taxAmount: inv.taxAmount || 0,
          total: inv.total || 0,
          paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
          sentAt: inv.sentAt ? new Date(inv.sentAt) : null,
          items: {
            create: (inv.items || []).map(
              (item: {
                description: string;
                quantity: number;
                rate: number;
                amount: number;
              }) => ({
                description: item.description || "",
                quantity: item.quantity || 0,
                rate: item.rate || 0,
                amount: item.amount || 0,
              })
            ),
          },
        },
      });
      imported++;
    }
    results.invoices = imported;
  }

  // Import presets
  if (backup.presets && Array.isArray(backup.presets)) {
    let imported = 0;
    for (const preset of backup.presets) {
      // Skip if a preset with same name already exists
      const existing = await prisma.presetItem.findFirst({
        where: { userId: user.id, name: preset.name },
      });
      if (!existing) {
        await prisma.presetItem.create({
          data: {
            userId: user.id,
            name: preset.name || "",
            description: preset.description || "",
            rate: preset.rate || 0,
          },
        });
        imported++;
      }
    }
    results.presets = imported;
  }

  return NextResponse.json({ success: true, imported: results });
}
