import { requireUser, requireActiveOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id, organizationId: org.id },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0);

  const totalInvoices = invoices.length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter(
    (i) => i.status === "sent" && new Date(i.dueDate) < new Date()
  ).length;
  const draftCount = invoices.filter((i) => i.status === "draft").length;

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Welcome back, {user.fullName}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
        <MetricCard
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          color="text-success"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <MetricCard
          label="Outstanding"
          value={`$${outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          color="text-warning"
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <MetricCard
          label="Total Invoices"
          value={totalInvoices.toString()}
          color="text-primary"
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
        <MetricCard
          label="Overdue"
          value={overdueCount.toString()}
          color="text-danger"
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-card-bg rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-4">
            Status Breakdown
          </h3>
          <div className="space-y-3">
            <StatusBar label="Paid" count={paidCount} total={totalInvoices} color="bg-success" />
            <StatusBar label="Sent" count={invoices.filter((i) => i.status === "sent").length} total={totalInvoices} color="bg-primary" />
            <StatusBar label="Draft" count={draftCount} total={totalInvoices} color="bg-muted" />
            <StatusBar label="Overdue" count={overdueCount} total={totalInvoices} color="bg-danger" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-card-bg rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-muted uppercase tracking-wide">
              Recent Invoices
            </h3>
            <Link href="/invoices" className="text-primary text-sm hover:underline">
              View all
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <p className="text-muted text-sm py-8 text-center">
              No invoices yet. Create your first invoice to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-background transition"
                >
                  <div>
                    <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                    <p className="text-muted text-xs">{inv.client.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      ${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-card-bg rounded-xl border border-border p-3 sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-muted text-xs sm:text-sm font-medium">{label}</span>
        <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${color} hidden sm:block`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <p className={`text-lg sm:text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-50 text-blue-600",
    paid: "bg-green-50 text-green-600",
    overdue: "bg-red-50 text-red-600",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status}
    </span>
  );
}
