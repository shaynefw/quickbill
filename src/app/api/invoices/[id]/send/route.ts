import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import nodemailer from "nodemailer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return NextResponse.json(
      { error: "SMTP not configured. Go to Settings to set up email." },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { items: true, client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = await prisma.emailTemplate.findFirst({
    where: { userId: user.id, type: "invoice" },
  });

  const companyName = user.companyName || user.fullName;
  const replacements: Record<string, string> = {
    "{{invoiceNumber}}": invoice.invoiceNumber,
    "{{clientName}}": invoice.client.name,
    "{{companyName}}": companyName,
    "{{total}}": `$${invoice.total.toFixed(2)}`,
    "{{dueDate}}": new Date(invoice.dueDate).toLocaleDateString(),
  };

  let subject = `Invoice ${invoice.invoiceNumber} from ${companyName}`;
  let body = `Hi ${invoice.client.name},\n\nPlease find invoice ${invoice.invoiceNumber} for $${invoice.total.toFixed(2)}.\n\nDue date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you!\n\n${companyName}`;

  if (template) {
    subject = template.subject;
    body = template.body;
    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
      body = body.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: invoice.client.email,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br>"),
  });

  await prisma.invoice.updateMany({
    where: { id, userId: user.id },
    data: { status: "sent", sentAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
