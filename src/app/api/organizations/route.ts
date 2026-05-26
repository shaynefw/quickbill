import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getActiveOrg } from "@/lib/session";

// List organizations for current user, plus indicate which is active
export async function GET() {
  const user = await requireUser();
  const orgs = await prisma.organization.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  // Make sure activeOrgId is set
  const active = await getActiveOrg(user.id);
  return NextResponse.json({
    organizations: orgs,
    activeOrgId: active?.id || null,
  });
}

// Create a new organization
export async function POST(request: Request) {
  const user = await requireUser();
  const data = await request.json();

  const org = await prisma.organization.create({
    data: {
      userId: user.id,
      name: data.name || "Untitled Business",
      companyName: data.companyName || data.name || "",
      companyEmail: data.companyEmail || "",
      companyPhone: data.companyPhone || "",
      companyAddress: data.companyAddress || "",
      logoUrl: data.logoUrl || "",
      primaryColor: data.primaryColor || "#2563eb",
      accentColor: data.accentColor || "#1e40af",
    },
  });

  // Seed default email templates for new orgs (mirrors registration defaults)
  await prisma.emailTemplate.createMany({
    data: [
      {
        userId: user.id,
        organizationId: org.id,
        name: "Invoice Email",
        type: "invoice",
        subject: "Invoice {{invoiceNumber}} from {{companyName}}",
        body: "Hi {{clientName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{total}}.\n\nDue date: {{dueDate}}\n\nThank you for your business!\n\n{{companyName}}",
      },
      {
        userId: user.id,
        organizationId: org.id,
        name: "Payment Receipt",
        type: "receipt",
        subject: "Payment Receipt - Invoice {{invoiceNumber}}",
        body: "Hi {{clientName}},\n\nThank you for your payment of {{total}} for invoice {{invoiceNumber}}.\n\nThis confirms that your payment has been received.\n\nBest regards,\n{{companyName}}",
      },
    ],
  });

  return NextResponse.json(org);
}

// Switch active organization
export async function PATCH(request: Request) {
  const user = await requireUser();
  const data = await request.json();
  if (!data.activeOrgId) {
    return NextResponse.json({ error: "activeOrgId required" }, { status: 400 });
  }
  // Verify ownership
  const org = await prisma.organization.findFirst({
    where: { id: data.activeOrgId, userId: user.id },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { activeOrgId: org.id },
  });
  return NextResponse.json({ activeOrgId: org.id });
}
