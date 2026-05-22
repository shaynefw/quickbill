"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { generateInvoicePdf } from "@/lib/generatePdf";

export default function InvoiceActions({
  invoiceId,
  status,
  clientEmail,
  invoiceNumber,
}: {
  invoiceId: string;
  status: string;
  clientEmail?: string;
  invoiceNumber?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function downloadPdf() {
    setOpen(false);
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

  async function openEmail() {
    setOpen(false);
    try {
      // Fetch invoice data, share link, and email templates in parallel
      const [pdfRes, shareRes, tmplRes] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}/pdf`),
        fetch(`/api/invoices/${invoiceId}/share`, { method: "POST" }),
        fetch("/api/email-templates"),
      ]);

      const { invoice: invData, user: userData } = await pdfRes.json();
      const { token } = await shareRes.json();
      const templates = await tmplRes.json();
      const shareUrl = `${window.location.origin}/share/${token}`;

      const invoiceTemplate = templates.find(
        (t: { type: string }) => t.type === "invoice"
      );

      const to = clientEmail || "";
      const totalFormatted = `$${Number(invData.total).toFixed(2)}`;
      const dueDateFormatted = new Date(invData.dueDate).toLocaleDateString();

      let subject: string;
      let body: string;

      if (invoiceTemplate) {
        const replacePlaceholders = (text: string) =>
          text
            .replace(/\{\{invoiceNumber\}\}/g, invData.invoiceNumber || "")
            .replace(/\{\{clientName\}\}/g, invData.client?.name || "")
            .replace(/\{\{total\}\}/g, totalFormatted)
            .replace(/\{\{dueDate\}\}/g, dueDateFormatted)
            .replace(/\{\{companyName\}\}/g, userData.companyName || "");

        subject = replacePlaceholders(invoiceTemplate.subject);
        body = replacePlaceholders(invoiceTemplate.body);
        body += `\n\nView & download your invoice here:\n${shareUrl}`;
      } else {
        subject = `Invoice ${invoiceNumber || ""}`;
        body = `Hi,\n\nPlease find invoice ${invoiceNumber || ""} for ${totalFormatted}.\n\nDue date: ${dueDateFormatted}\n\nView & download your invoice here:\n${shareUrl}\n\nThank you!`;
      }

      window.open(
        `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        "_blank"
      );
    } catch {
      // Fallback to basic mailto
      const to = clientEmail || "";
      const subject = encodeURIComponent(`Invoice ${invoiceNumber || ""}`);
      const body = encodeURIComponent(
        `Hi,\n\nPlease find invoice ${invoiceNumber || ""}.\n\nThank you!`
      );
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
    }
  }

  async function sendReceiptEmail() {
    setOpen(false);
    try {
      const [pdfRes, shareRes, tmplRes] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}/pdf`),
        fetch(`/api/invoices/${invoiceId}/share`, { method: "POST" }),
        fetch("/api/email-templates"),
      ]);
      const { invoice: invData, user: userData } = await pdfRes.json();
      const { token } = await shareRes.json();
      const templates = await tmplRes.json();
      const shareUrl = `${window.location.origin}/share/${token}`;
      const receiptTemplate = templates.find(
        (t: { type: string }) => t.type === "receipt"
      );

      const to = clientEmail || "";
      const totalFormatted = `$${Number(invData.total).toFixed(2)}`;
      const dueDateFormatted = new Date(invData.dueDate).toLocaleDateString();

      let subject: string;
      let body: string;

      if (receiptTemplate) {
        const replacePlaceholders = (text: string) =>
          text
            .replace(/\{\{invoiceNumber\}\}/g, invData.invoiceNumber || "")
            .replace(/\{\{clientName\}\}/g, invData.client?.name || "")
            .replace(/\{\{total\}\}/g, totalFormatted)
            .replace(/\{\{dueDate\}\}/g, dueDateFormatted)
            .replace(/\{\{companyName\}\}/g, userData.companyName || "");
        subject = replacePlaceholders(receiptTemplate.subject);
        body = replacePlaceholders(receiptTemplate.body);
        body += `\n\nView your paid invoice here:\n${shareUrl}`;
      } else {
        subject = `Payment Receipt - Invoice ${invoiceNumber || ""}`;
        body = `Hi,\n\nThank you for your payment of ${totalFormatted} for invoice ${invoiceNumber || ""}.\n\nThis confirms that your payment has been received.\n\nView your paid invoice here:\n${shareUrl}\n\nBest regards,\n${userData.companyName || ""}`;
      }

      window.open(
        `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        "_blank"
      );
    } catch {
      const to = clientEmail || "";
      const subject = encodeURIComponent(`Payment Receipt - Invoice ${invoiceNumber || ""}`);
      const body = encodeURIComponent(
        `Hi,\n\nThank you for your payment for invoice ${invoiceNumber || ""}.\n\nBest regards`
      );
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
    }
  }

  async function markSent() {
    setOpen(false);
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    router.refresh();
  }

  async function markPaid() {
    setOpen(false);
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    router.refresh();
  }

  async function undoPaid() {
    setOpen(false);
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent", undoPaid: true }),
    });
    router.refresh();
  }

  async function deleteInvoice() {
    setOpen(false);
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    router.push("/invoices");
    router.refresh();
  }

  // Primary status button shown above the dropdown
  const primaryAction =
    status === "draft"
      ? { label: "Mark as Sent", onClick: markSent, color: "bg-primary hover:bg-primary-dark text-white" }
      : status === "sent"
      ? { label: "Mark as Paid", onClick: markPaid, color: "bg-green-600 hover:bg-green-700 text-white" }
      : status === "paid"
      ? { label: "Send Receipt", onClick: sendReceiptEmail, color: "bg-green-600 hover:bg-green-700 text-white" }
      : null;

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      {/* Primary status action button */}
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${primaryAction.color}`}
        >
          {primaryAction.label}
        </button>
      )}

      {/* Actions dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 text-muted hover:text-primary rounded hover:bg-gray-100 transition"
          title="More actions"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg z-20 min-w-[180px] py-1">
            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Generating..." : "Download PDF"}
            </button>

            <button
              onClick={openEmail}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send via Email
            </button>

            {status !== "paid" && (
              <>
                <div className="border-t border-border my-1" />
                <Link
                  href={`/invoices/${invoiceId}/edit`}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => setOpen(false)}
                >
                  <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Invoice
                </Link>
              </>
            )}

            {status === "paid" && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  onClick={undoPaid}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo Payment
                </button>
              </>
            )}

            <div className="border-t border-border my-1" />
            <button
              onClick={deleteInvoice}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
