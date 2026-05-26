import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveOrg } from "@/lib/session";

// Settings now reads from/writes to the user's active Organization.
// The legacy User company fields are kept in DB but no longer used by the UI.

export async function GET() {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  return NextResponse.json({
    organizationId: org.id,
    organizationName: org.name,
    companyName: org.companyName,
    companyEmail: org.companyEmail,
    companyPhone: org.companyPhone,
    companyAddress: org.companyAddress,
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    accentColor: org.accentColor,
  });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);
  const data = await request.json();

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      companyPhone: data.companyPhone,
      companyAddress: data.companyAddress,
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
    },
  });

  return NextResponse.json({ success: true });
}
