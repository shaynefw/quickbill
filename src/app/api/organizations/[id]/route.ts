import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const org = await prisma.organization.findFirst({
    where: { id, userId: user.id },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(org);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const data = await request.json();

  const existing = await prisma.organization.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      companyName: data.companyName ?? existing.companyName,
      companyEmail: data.companyEmail ?? existing.companyEmail,
      companyPhone: data.companyPhone ?? existing.companyPhone,
      companyAddress: data.companyAddress ?? existing.companyAddress,
      logoUrl: data.logoUrl ?? existing.logoUrl,
      primaryColor: data.primaryColor ?? existing.primaryColor,
      accentColor: data.accentColor ?? existing.accentColor,
    },
  });
  return NextResponse.json(org);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.organization.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Don't allow deleting the last organization
  const count = await prisma.organization.count({ where: { userId: user.id } });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Cannot delete your only organization" },
      { status: 400 }
    );
  }

  await prisma.organization.delete({ where: { id } });

  // If deleted org was active, switch to another
  if (user.activeOrgId === id) {
    const next = await prisma.organization.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { activeOrgId: next?.id || null },
    });
  }

  return NextResponse.json({ success: true });
}
