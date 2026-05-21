import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { items: true, client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const primaryColor = user.primaryColor || "#2563eb";
  const companyName = user.companyName || user.fullName;

  const itemRows = invoice.items
    .map(
      (item, i) => `
    <tr style="background: ${i % 2 === 0 ? "#f8fafc" : "#ffffff"}">
      <td style="padding: 10px 16px; font-size: 13px">${escapeHtml(item.description)}</td>
      <td style="padding: 10px 16px; font-size: 13px; text-align: right">${item.quantity}</td>
      <td style="padding: 10px 16px; font-size: 13px; text-align: right">$${item.rate.toFixed(2)}</td>
      <td style="padding: 10px 16px; font-size: 13px; text-align: right; font-weight: 600">$${item.amount.toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid ${primaryColor}; }
    .company-name { font-size: 20px; font-weight: 700; color: ${primaryColor}; margin-bottom: 4px; }
    .company-info { font-size: 12px; color: #64748b; line-height: 1.6; }
    .invoice-title { font-size: 28px; font-weight: 700; color: ${primaryColor}; text-align: right; margin-bottom: 8px; }
    .invoice-meta { font-size: 12px; text-align: right; line-height: 1.8; }
    .invoice-meta span { color: #64748b; }
    .bill-to { margin-bottom: 24px; }
    .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${primaryColor}; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: ${primaryColor}; color: white; }
    thead th { padding: 10px 16px; font-size: 12px; font-weight: 600; text-align: left; }
    thead th:not(:first-child) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 240px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .totals-row.total { border-top: 3px solid ${primaryColor}; padding-top: 8px; margin-top: 8px; font-size: 18px; font-weight: 700; }
    .totals-row.total .amount { color: ${primaryColor}; }
    .notes { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    .notes p { font-size: 12px; color: #64748b; white-space: pre-line; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${user.logoUrl ? `<img src="${user.logoUrl}" alt="Logo" style="height: 48px; margin-bottom: 8px; object-fit: contain">` : ""}
      <div class="company-name">${escapeHtml(companyName)}</div>
      <div class="company-info">
        ${user.companyEmail ? escapeHtml(user.companyEmail) + "<br>" : ""}
        ${user.companyPhone ? escapeHtml(user.companyPhone) + "<br>" : ""}
        ${user.companyAddress ? escapeHtml(user.companyAddress).replace(/\n/g, "<br>") : ""}
      </div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <span>Invoice #:</span> ${escapeHtml(invoice.invoiceNumber)}<br>
        <span>Date:</span> ${new Date(invoice.issueDate).toLocaleDateString()}<br>
        <span>Due Date:</span> ${new Date(invoice.dueDate).toLocaleDateString()}
      </div>
    </div>
  </div>

  <div class="bill-to">
    <div class="section-label">Bill To</div>
    <div style="font-weight: 600; margin-bottom: 2px">${escapeHtml(invoice.client.name)}</div>
    ${invoice.client.company ? `<div style="font-size: 13px; color: #64748b">${escapeHtml(invoice.client.company)}</div>` : ""}
    <div style="font-size: 13px; color: #64748b">${escapeHtml(invoice.client.email)}</div>
    ${invoice.client.address ? `<div style="font-size: 13px; color: #64748b; white-space: pre-line">${escapeHtml(invoice.client.address)}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right">Qty</th>
        <th style="text-align: right">Rate</th>
        <th style="text-align: right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span style="color: #64748b">Subtotal</span>
        <span>$${invoice.subtotal.toFixed(2)}</span>
      </div>
      ${
        invoice.taxRate > 0
          ? `<div class="totals-row">
        <span style="color: #64748b">Tax (${invoice.taxRate}%)</span>
        <span>$${invoice.taxAmount.toFixed(2)}</span>
      </div>`
          : ""
      }
      <div class="totals-row total">
        <span>Total</span>
        <span class="amount">$${invoice.total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  ${
    invoice.notes
      ? `<div class="notes">
    <div class="section-label">Notes</div>
    <p>${escapeHtml(invoice.notes)}</p>
  </div>`
      : ""
  }
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.html"`,
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
