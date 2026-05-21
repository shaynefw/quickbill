import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import InvoiceActions from "@/components/InvoiceActions";

export default async function InvoicesPage() {
  const user = await requireUser();

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-50 text-blue-600",
    paid: "bg-green-50 text-green-600",
    overdue: "bg-red-50 text-red-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold">Invoices</h1>
        <Link
          href="/invoices/new"
          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition flex items-center gap-2 text-sm sm:text-base"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Invoice</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-8 sm:p-12 text-center">
          <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-muted mb-2">No invoices yet</p>
          <Link href="/invoices/new" className="text-primary hover:underline text-sm">
            Create your first invoice
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-card-bg rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                    <p className="text-sm text-muted mt-0.5">{inv.client.name}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-medium capitalize ${statusStyles[inv.status] || statusStyles.draft}`}>
                    {inv.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold">
                      ${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted">
                      Due {new Date(inv.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <InvoiceActions invoiceId={inv.id} status={inv.status} clientEmail={inv.client.email} invoiceNumber={inv.invoiceNumber} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block bg-card-bg rounded-xl border border-border overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted">
                  <th className="px-5 py-3 font-medium">Invoice #</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Due Date</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm">{inv.client.name}</td>
                    <td className="px-5 py-3 text-sm text-muted">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      ${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium capitalize ${statusStyles[inv.status] || statusStyles.draft}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <InvoiceActions invoiceId={inv.id} status={inv.status} clientEmail={inv.client.email} invoiceNumber={inv.invoiceNumber} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
