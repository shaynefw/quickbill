"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateInvoicePdf } from "@/lib/generatePdf";

export default function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
      const { invoice, user } = await res.json();
      const doc = await generateInvoicePdf(invoice, user);
      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch {
      alert("Failed to generate PDF");
    }
    setDownloading(false);
  }

  async function sendInvoice() {
    setSending(true);
    const res = await fetch(`/api/invoices/${invoiceId}/send`, {
      method: "POST",
    });
    setSending(false);
    if (res.ok) {
      alert("Invoice sent successfully!");
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to send invoice.");
    }
  }

  async function markSent() {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    router.refresh();
  }

  async function markPaid() {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    router.refresh();
  }

  async function undoPaid() {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent", undoPaid: true }),
    });
    router.refresh();
  }

  async function deleteInvoice() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    router.push("/invoices");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Download PDF */}
      <button
        onClick={downloadPdf}
        disabled={downloading}
        className="p-1.5 text-muted hover:text-primary rounded disabled:opacity-50"
        title="Download PDF"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {/* Status-dependent actions */}
      {status === "draft" && (
        <>
          <button
            onClick={markSent}
            className="p-1.5 text-muted hover:text-primary rounded"
            title="Mark as sent"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
          <button
            onClick={sendInvoice}
            disabled={sending}
            className="p-1.5 text-muted hover:text-primary rounded disabled:opacity-50"
            title="Send via email"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </>
      )}

      {status === "sent" && (
        <>
          <button
            onClick={markPaid}
            className="p-1.5 text-muted hover:text-success rounded"
            title="Mark as paid"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={sendInvoice}
            disabled={sending}
            className="p-1.5 text-muted hover:text-primary rounded disabled:opacity-50"
            title="Resend via email"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </>
      )}

      {status === "paid" && (
        <button
          onClick={undoPaid}
          className="p-1.5 text-muted hover:text-warning rounded"
          title="Undo mark as paid"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      )}

      {/* Edit — only for draft/sent */}
      {status !== "paid" && (
        <Link
          href={`/invoices/${invoiceId}/edit`}
          className="p-1.5 text-muted hover:text-primary rounded"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Link>
      )}

      {/* Delete */}
      <button
        onClick={deleteInvoice}
        className="p-1.5 text-muted hover:text-danger rounded"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
