import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notFound } from "next/navigation";
import InvoiceActions from "@/components/InvoiceActions";
import { formatDate } from "@/lib/dates";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { items: true, client: true },
  });

  if (!invoice) notFound();

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-50 text-blue-600",
    paid: "bg-green-50 text-green-600",
    overdue: "bg-red-50 text-red-600",
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              statusStyles[invoice.status] || statusStyles.draft
            }`}
          >
            {invoice.status}
          </span>
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} clientEmail={invoice.client.email} invoiceNumber={invoice.invoiceNumber} />
      </div>

      <div
        className="bg-white rounded-xl border border-border p-4 sm:p-8 shadow-sm overflow-x-auto"
        style={{ "--inv-primary": user.primaryColor } as React.CSSProperties}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2" style={{ borderColor: user.primaryColor }}>
          <div>
            {user.logoUrl && (
              <img
                src={user.logoUrl}
                alt="Logo"
                className="h-12 mb-3 object-contain"
              />
            )}
            <h2 className="text-xl font-bold" style={{ color: user.primaryColor }}>
              {user.companyName || user.fullName}
            </h2>
            {user.companyEmail && (
              <p className="text-sm text-muted">{user.companyEmail}</p>
            )}
            {user.companyPhone && (
              <p className="text-sm text-muted">{user.companyPhone}</p>
            )}
            {user.companyAddress && (
              <p className="text-sm text-muted whitespace-pre-line">
                {user.companyAddress}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <h3
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: user.primaryColor }}
            >
              INVOICE
            </h3>
            <p className="text-sm">
              <span className="text-muted">Invoice #:</span>{" "}
              {invoice.invoiceNumber}
            </p>
            <p className="text-sm">
              <span className="text-muted">Date:</span>{" "}
              {formatDate(invoice.issueDate)}
            </p>
            <p className="text-sm">
              <span className="text-muted">Due Date:</span>{" "}
              {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: user.primaryColor }}
          >
            Bill To
          </h4>
          <p className="font-medium">{invoice.client.name}</p>
          {invoice.client.company && (
            <p className="text-sm text-muted">{invoice.client.company}</p>
          )}
          <p className="text-sm text-muted">{invoice.client.email}</p>
          {invoice.client.address && (
            <p className="text-sm text-muted whitespace-pre-line">
              {invoice.client.address}
            </p>
          )}
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr
              className="text-left text-sm text-white"
              style={{ backgroundColor: user.primaryColor }}
            >
              <th className="px-4 py-2.5 rounded-tl-lg">Description</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Rate</th>
              <th className="px-4 py-2.5 text-right rounded-tr-lg">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr
                key={item.id}
                className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}
              >
                <td className="px-4 py-2.5 text-sm">{item.description}</td>
                <td className="px-4 py-2.5 text-sm text-right">
                  {item.quantity}
                </td>
                <td className="px-4 py-2.5 text-sm text-right">
                  ${item.rate.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-sm text-right font-medium">
                  ${item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountType !== "none" && invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">
                  Discount
                  {invoice.discountType === "percentage"
                    ? ` (${invoice.discountValue}%)`
                    : ""}
                </span>
                <span className="text-red-500">
                  -${invoice.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            {invoice.taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tax ({invoice.taxRate}%)</span>
                <span>${invoice.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div
              className="flex justify-between font-bold text-lg pt-2 border-t-2"
              style={{ borderColor: user.primaryColor }}
            >
              <span>Total</span>
              <span style={{ color: user.primaryColor }}>
                ${invoice.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-border">
            <h4
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: user.primaryColor }}
            >
              Notes
            </h4>
            <p className="text-sm text-muted whitespace-pre-line">
              {invoice.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
