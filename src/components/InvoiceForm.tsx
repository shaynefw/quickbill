"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  id?: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  items: LineItem[];
}

export default function InvoiceForm({
  initialData,
}: {
  initialData?: InvoiceData;
}) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(initialData?.clientId || "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoiceNumber || ""
  );
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ||
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items?.length
      ? initialData.items
      : [{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }]
  );

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients);
  }, []);

  useEffect(() => {
    if (!initialData && !invoiceNumber) {
      const num = `INV-${Date.now().toString(36).toUpperCase()}`;
      setInvoiceNumber(num);
    }
  }, [initialData, invoiceNumber]);

  function updateItem(index: number, field: string, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      item.amount = item.quantity * item.rate;
      updated[index] = item;
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(status: string) {
    if (!clientId) {
      alert("Please select a client");
      return;
    }
    if (items.some((i) => !i.description || i.rate <= 0)) {
      alert("Please fill in all line items with valid rates");
      return;
    }

    setSaving(true);
    const body = {
      invoiceNumber,
      clientId,
      issueDate,
      dueDate,
      taxRate,
      notes,
      status,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        rate: i.rate,
        amount: i.amount,
      })),
      subtotal,
      taxAmount,
      total,
    };

    const url = initialData?.id
      ? `/api/invoices/${initialData.id}`
      : "/api/invoices";
    const method = initialData?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/invoices");
      router.refresh();
    } else {
      alert("Failed to save invoice");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-card-bg rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Invoice Number
            </label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Issue Date
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">Line Items</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Rate ($)</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1"></div>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">
                <input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder="Item description"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) =>
                    updateItem(index, "rate", parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2 text-sm font-medium px-1">
                ${item.amount.toFixed(2)}
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeItem(index)}
                  className="p-1.5 text-muted hover:text-danger rounded"
                  disabled={items.length <= 1}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add line item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card-bg rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Payment terms, thank you message, etc."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
        </div>

        <div className="bg-card-bg rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted">Tax</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) =>
                    setTaxRate(parseFloat(e.target.value) || 0)
                  }
                  className="w-16 px-2 py-1 border border-border rounded text-sm text-center"
                />
                <span className="text-muted">%</span>
              </div>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSubmit("draft")}
          disabled={saving}
          className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit("sent")}
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          Save & Mark Sent
        </button>
      </div>
    </div>
  );
}
