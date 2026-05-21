import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    companyName: user.companyName,
    companyEmail: user.companyEmail,
    companyPhone: user.companyPhone,
    companyAddress: user.companyAddress,
    logoUrl: user.logoUrl,
    primaryColor: user.primaryColor,
    accentColor: user.accentColor,
  });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  const data = await request.json();

  await prisma.user.update({
    where: { id: user.id },
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
