import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { username, password, fullName } = await request.json();

  if (!username || !password || !fullName) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName,
    },
  });

  // Create a default organization for the new user
  const org = await prisma.organization.create({
    data: {
      userId: newUser.id,
      name: `${fullName}'s Business`,
    },
  });

  // Set as active and seed default email templates
  await prisma.user.update({
    where: { id: newUser.id },
    data: { activeOrgId: org.id },
  });

  await prisma.emailTemplate.createMany({
    data: [
      {
        userId: newUser.id,
        organizationId: org.id,
        name: "Invoice Email",
        type: "invoice",
        subject: "Invoice {{invoiceNumber}} from {{companyName}}",
        body: "Hi {{clientName}},\n\nPlease find attached invoice {{invoiceNumber}} for {{total}}.\n\nDue date: {{dueDate}}\n\nThank you for your business!\n\n{{companyName}}",
      },
      {
        userId: newUser.id,
        organizationId: org.id,
        name: "Payment Receipt",
        type: "receipt",
        subject: "Payment Receipt - Invoice {{invoiceNumber}}",
        body: "Hi {{clientName}},\n\nThank you for your payment of {{total}} for invoice {{invoiceNumber}}.\n\nThis confirms that your payment has been received.\n\nBest regards,\n{{companyName}}",
      },
    ],
  });

  return NextResponse.json({ success: true });
}
