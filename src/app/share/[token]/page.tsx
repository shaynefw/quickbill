import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ShareInvoiceClient from "./ShareInvoiceClient";
import { formatDate } from "@/lib/dates";

export default async function ShareInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { shareToken: token },
    include: {
      items: true,
      client: true,
      organization: true,
      user: {
        select: {
          fullName: true,
          companyName: true,
          companyEmail: true,
          companyPhone: true,
          companyAddress: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
    },
  });

  if (!invoice) notFound();

  const user = invoice.user;
  const org = invoice.organization;

  // Serialize dates for client component
  const invoiceData = {
    ...invoice,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() || null,
    sentAt: invoice.sentAt?.toISOString() || null,
  };

  const userData = {
    companyName: org?.companyName || user.companyName || user.fullName,
    companyEmail: org?.companyEmail || user.companyEmail,
    companyPhone: org?.companyPhone || user.companyPhone,
    companyAddress: org?.companyAddress || user.companyAddress,
    logoUrl: org?.logoUrl || user.logoUrl,
    primaryColor: org?.primaryColor || user.primaryColor || "#2563eb",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header with download button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold" style={{ color: userData.primaryColor }}>
              {userData.companyName}
            </h1>
            <p className="text-sm text-gray-500">
              Invoice {invoice.invoiceNumber}
            </p>
          </div>
          <ShareInvoiceClient invoiceData={invoiceData} userData={userData} />
        </div>

        {/* Invoice preview */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm relative overflow-hidden"
        >
          {/* PAID stamp watermark overlay */}
          {invoice.status === "paid" && (
            <div
              className="absolute pointer-events-none select-none"
              style={{
                top: "40%",
                left: "55%",
                transform: "translate(-50%, -50%) rotate(-18deg)",
                opacity: 0.45,
                zIndex: 10,
              }}
            >
              <div
                className="border-[6px] border-double border-green-600 rounded-md px-8 py-3 sm:px-12 sm:py-4"
                style={{ boxShadow: "0 0 0 3px rgba(22, 163, 74, 0.15)" }}
              >
                <div className="text-green-600 font-extrabold tracking-[0.25em] text-5xl sm:text-7xl leading-none">
                  PAID
                </div>
                {invoice.paidAt && (
                  <div className="text-center text-green-700 font-semibold text-xs sm:text-sm tracking-widest mt-1">
                    {formatDate(invoice.paidAt)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pb-6 border-b-2" style={{ borderColor: userData.primaryColor }}>
            <div>
              {userData.logoUrl && (
                <img
                  src={userData.logoUrl}
                  alt="Logo"
                  className="h-12 mb-3 object-contain"
                />
              )}
              <h2 className="text-xl font-bold" style={{ color: userData.primaryColor }}>
                {userData.companyName}
              </h2>
              {userData.companyEmail && (
                <p className="text-sm text-gray-500">{userData.companyEmail}</p>
              )}
              {userData.companyPhone && (
                <p className="text-sm text-gray-500">{userData.companyPhone}</p>
              )}
              {userData.companyAddress && (
                <p className="text-sm text-gray-500 whitespace-pre-line">
                  {userData.companyAddress}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <h3 className="text-2xl font-bold mb-2" style={{ color: userData.primaryColor }}>
                INVOICE
              </h3>
              <p className="text-sm">
                <span className="text-gray-500">Invoice #:</span>{" "}
                {invoice.invoiceNumber}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Date:</span>{" "}
                {formatDate(invoice.issueDate)}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Due Date:</span>{" "}
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h4
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: userData.primaryColor }}
            >
              Bill To
            </h4>
            <p className="font-medium">{invoice.client.name}</p>
            {invoice.client.company && (
              <p className="text-sm text-gray-500">{invoice.client.company}</p>
            )}
            <p className="text-sm text-gray-500">{invoice.client.email}</p>
            {invoice.client.address && (
              <p className="text-sm text-gray-500 whitespace-pre-line">
                {invoice.client.address}
              </p>
            )}
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="text-left text-sm text-white" style={{ backgroundColor: userData.primaryColor }}>
                <th className="px-4 py-2.5 rounded-tl-lg">Description</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Rate</th>
                <th className="px-4 py-2.5 text-right rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-2.5 text-sm">{item.description}</td>
                  <td className="px-4 py-2.5 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-right">${item.rate.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discountType !== "none" && invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Discount
                    {invoice.discountType === "percentage" ? ` (${invoice.discountValue}%)` : ""}
                  </span>
                  <span className="text-red-500">-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({invoice.taxRate}%)</span>
                  <span>${invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-lg pt-2 border-t-2"
                style={{ borderColor: userData.primaryColor }}
              >
                <span>Total</span>
                <span style={{ color: userData.primaryColor }}>
                  ${invoice.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: userData.primaryColor }}>
                Notes
              </h4>
              <p className="text-sm text-gray-500 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by QuickBill
        </p>
      </div>
    </div>
  );
}
