"use client";

import { useState } from "react";
import { generateInvoicePdf } from "@/lib/generatePdf";

interface ShareInvoiceClientProps {
  invoiceData: {
    invoiceNumber: string;
    status: string;
    issueDate: string;
    dueDate: string;
    notes: string;
    subtotal: number;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    items: {
      id: string;
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }[];
    client: {
      name: string;
      email: string;
      company: string;
      address: string;
    };
  };
  userData: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    logoUrl: string;
    primaryColor: string;
  };
}

export default function ShareInvoiceClient({
  invoiceData,
  userData,
}: ShareInvoiceClientProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const doc = await generateInvoicePdf(invoiceData, userData);
      doc.save(`${invoiceData.invoiceNumber}.pdf`);
    } catch {
      alert("Failed to generate PDF");
    }
    setDownloading(false);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition flex items-center gap-2 disabled:opacity-50"
      style={{ backgroundColor: userData.primaryColor }}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {downloading ? "Generating..." : "Download PDF"}
    </button>
  );
}
