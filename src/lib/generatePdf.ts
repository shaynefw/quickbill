import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  notes: string;
  subtotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  client: {
    name: string;
    email: string;
    company?: string;
    address?: string;
  };
}

interface UserData {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  logoUrl: string;
  primaryColor: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [37, 99, 235];
}

export async function generateInvoicePdf(invoice: InvoiceData, user: UserData) {
  const doc = new jsPDF();
  const primaryRgb = hexToRgb(user.primaryColor);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Top colored bar
  doc.setFillColor(...primaryRgb);
  doc.rect(0, 0, pageWidth, 4, "F");

  let yPos = 16;

  // === LEFT SIDE: Logo + Company Info ===
  const leftStartY = yPos;

  // Logo
  if (user.logoUrl && user.logoUrl.startsWith("data:image")) {
    try {
      doc.addImage(user.logoUrl, "PNG", margin, yPos, 32, 16);
      yPos += 24;
    } catch {
      // Skip logo if it fails
    }
  }

  // Company name
  doc.setFontSize(16);
  doc.setTextColor(...primaryRgb);
  doc.setFont("helvetica", "bold");
  doc.text(user.companyName, margin, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");

  if (user.companyEmail) {
    doc.text(user.companyEmail, margin, yPos);
    yPos += 4.5;
  }
  if (user.companyPhone) {
    doc.text(user.companyPhone, margin, yPos);
    yPos += 4.5;
  }
  if (user.companyAddress) {
    const lines = user.companyAddress.split("\n");
    lines.forEach((line) => {
      doc.text(line, margin, yPos);
      yPos += 4.5;
    });
  }

  const leftEndY = yPos;

  // === RIGHT SIDE: INVOICE title + meta (positioned independently) ===
  const metaX = pageWidth - margin;
  let rightY = leftStartY;

  // INVOICE title
  doc.setFontSize(24);
  doc.setTextColor(...primaryRgb);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", metaX, rightY + 4, { align: "right" });
  rightY += 14;

  // Invoice meta
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.setTextColor(100, 116, 139);
  doc.text("Invoice #:", metaX - 45, rightY);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceNumber, metaX, rightY, { align: "right" });
  rightY += 5.5;

  doc.setTextColor(100, 116, 139);
  doc.text("Date:", metaX - 45, rightY);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(invoice.issueDate).toLocaleDateString(), metaX, rightY, { align: "right" });
  rightY += 5.5;

  doc.setTextColor(100, 116, 139);
  doc.text("Due Date:", metaX - 45, rightY);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(invoice.dueDate).toLocaleDateString(), metaX, rightY, { align: "right" });

  // PAID stamp will be drawn as a watermark overlay AFTER the main content
  // (deferred to end of function so it appears on top of all content)

  // Divider line — use the taller of the two columns
  yPos = Math.max(leftEndY, rightY) + 10;
  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Bill To
  doc.setFontSize(9);
  doc.setTextColor(...primaryRgb);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, yPos);
  yPos += 5;

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.client.name, margin, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");

  if (invoice.client.company) {
    doc.text(invoice.client.company, margin, yPos);
    yPos += 4;
  }
  doc.text(invoice.client.email, margin, yPos);
  yPos += 4;
  if (invoice.client.address) {
    const lines = invoice.client.address.split("\n");
    lines.forEach((line) => {
      doc.text(line, margin, yPos);
      yPos += 4;
    });
  }

  yPos += 6;

  // Line items table
  const tableBody = invoice.items.map((item) => [
    item.description,
    item.quantity.toString(),
    `$${item.rate.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30, fontStyle: "bold" },
    },
    theme: "plain",
    styles: {
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Summary section (right aligned)
  const summaryX = pageWidth - margin - 70;
  const valueX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", summaryX, yPos);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, valueX, yPos, { align: "right" });
  yPos += 6;

  if (invoice.discountType !== "none" && invoice.discountAmount > 0) {
    doc.setTextColor(100, 116, 139);
    const discLabel =
      invoice.discountType === "percentage"
        ? `Discount (${invoice.discountValue}%)`
        : "Discount";
    doc.text(discLabel, summaryX, yPos);
    doc.setTextColor(220, 38, 38);
    doc.text(`-$${invoice.discountAmount.toFixed(2)}`, valueX, yPos, { align: "right" });
    yPos += 6;
  }

  if (invoice.taxRate > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text(`Tax (${invoice.taxRate}%)`, summaryX, yPos);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${invoice.taxAmount.toFixed(2)}`, valueX, yPos, { align: "right" });
    yPos += 6;
  }

  // Total divider
  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(0.8);
  doc.line(summaryX, yPos, valueX, yPos);
  yPos += 7;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Total", summaryX, yPos);
  doc.setTextColor(...primaryRgb);
  doc.text(`$${invoice.total.toFixed(2)}`, valueX, yPos, { align: "right" });
  yPos += 10;

  // Notes
  if (invoice.notes) {
    yPos += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(...primaryRgb);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, yPos);
  }

  // PAID stamp overlay (drawn last so it sits on top of all content)
  if (invoice.status === "paid" && typeof document !== "undefined") {
    // Render the stamp on an HTML5 canvas, then embed as image.
    // Canvas gives reliable rotation, alpha, and font rendering.
    const scale = 3; // higher = sharper in PDF
    const canvasW = 600 * scale;
    const canvasH = 300 * scale;
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(scale, scale);
      ctx.translate(300, 150);
      ctx.rotate((-15 * Math.PI) / 180);
      ctx.globalAlpha = 0.5;
      const stampColor = "#16a34a";
      ctx.strokeStyle = stampColor;
      ctx.fillStyle = stampColor;

      // Outer + inner double-border box
      ctx.lineWidth = 8;
      ctx.strokeRect(-220, -75, 440, 150);
      ctx.lineWidth = 3;
      ctx.strokeRect(-208, -63, 416, 126);

      // PAID text
      ctx.font = "900 130px Arial, Helvetica, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAID", 0, -12);

      // Paid date below
      if (invoice.paidAt) {
        ctx.font = "bold 26px Arial, Helvetica, sans-serif";
        ctx.fillText(
          new Date(invoice.paidAt).toLocaleDateString(),
          0,
          55
        );
      }

      // Add stamp image — sized in PDF mm units
      const stampWidthMm = 90;
      const stampHeightMm = (stampWidthMm * canvasH) / canvasW;
      const stampX = pageWidth / 2 - 5;
      const stampY = 80;
      doc.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        stampX,
        stampY,
        stampWidthMm,
        stampHeightMm
      );
    }
  }

  return doc;
}
