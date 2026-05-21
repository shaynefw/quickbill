import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Resend } from "resend";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service not configured. Add RESEND_API_KEY to environment variables." },
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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [invoice.client.email],
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await prisma.invoice.updateMany({
    where: { id, userId: user.id },
    data: { status: "sent", sentAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
