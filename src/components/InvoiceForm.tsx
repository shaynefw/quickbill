"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface PresetItem {
  id: string;
  name: string;
  description: string;
  rate: number;
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
  discountType?: string;
  discountValue?: number;
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
  const [presetItems, setPresetItems] = useState<PresetItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState(initialData?.clientId || "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoiceNumber || ""
  );
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate || new Date().toISOString().split("T")[0]
  );
  const [duePreset, setDuePreset] = useState<string>(() => {
    if (!initialData?.dueDate) return "receipt";
    const issue = new Date(initialData.issueDate || new Date().toISOString());
    const due = new Date(initialData.dueDate);
    const diff = Math.round((due.getTime() - issue.getTime()) / 86400000);
    if (diff === 0) return "receipt";
    if (diff === 7) return "net7";
    if (diff === 14) return "net14";
    if (diff === 30) return "net30";
    return "custom";
  });

  function applyDuePreset(preset: string, baseIssue: string = issueDate) {
    setDuePreset(preset);
    const base = new Date(baseIssue);
    if (preset === "receipt") setDueDate(baseIssue);
    else if (preset === "net7") setDueDate(new Date(base.getTime() + 7 * 86400000).toISOString().split("T")[0]);
    else if (preset === "net14") setDueDate(new Date(base.getTime() + 14 * 86400000).toISOString().split("T")[0]);
    else if (preset === "net30") setDueDate(new Date(base.getTime() + 30 * 86400000).toISOString().split("T")[0]);
  }
  const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);
  const [discountType, setDiscountType] = useState(
    initialData?.discountType || "none"
  );
  const [discountValue, setDiscountValue] = useState(
    initialData?.discountValue || 0
  );
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
    fetch("/api/preset-items")
      .then((r) => r.json())
      .then(setPresetItems);
  }, []);

  useEffect(() => {
    if (!initialData && !invoiceNumber) {
      const num = `INV-${Date.now().toString(36).toUpperCase()}`;
      setInvoiceNumber(num);
    }
  }, [initialData, invoiceNumber]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setShowSaveMenu(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) {
        setShowQuickAdd(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  function addPresetItem(preset: PresetItem) {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: preset.description,
        quantity: 1,
        rate: preset.rate,
        amount: preset.rate,
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const discountAmount =
    discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : discountType === "fixed"
      ? Math.min(discountValue, subtotal)
      : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

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
    setShowSaveMenu(false);
    const body = {
      invoiceNumber,
      clientId,
      issueDate,
      dueDate,
      taxRate,
      discountType,
      discountValue,
      discountAmount,
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
      <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6 mb-6">
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
              onChange={(e) => {
                setIssueDate(e.target.value);
                if (duePreset !== "custom") applyDuePreset(duePreset, e.target.value);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Terms</label>
            <select
              value={duePreset}
              onChange={(e) => applyDuePreset(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white mb-2"
            >
              <option value="receipt">Due upon receipt</option>
              <option value="net7">Net 7 (due in 7 days)</option>
              <option value="net14">Net 14 (due in 14 days)</option>
              <option value="net30">Net 30 (due in 30 days)</option>
              <option value="custom">Custom date</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setDuePreset("custom");
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Line Items</h2>
          {presetItems.length > 0 && (
            <div className="relative" ref={quickAddRef}>
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Quick Add
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showQuickAdd && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[240px] py-1">
                  <p className="px-4 py-1.5 text-xs font-medium text-muted uppercase tracking-wide">Preset Items</p>
                  {presetItems.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => { addPresetItem(preset); setShowQuickAdd(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between items-center gap-4"
                    >
                      <div>
                        <p className="font-medium">{preset.name}</p>
                        <p className="text-xs text-muted">{preset.description}</p>
                      </div>
                      <span className="text-xs font-mono text-muted whitespace-nowrap">
                        ${preset.rate.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 text-xs font-medium text-muted px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Rate ($)</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1"></div>
          </div>
          {items.map((item, index) => (
            <div key={item.id}>
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min="1" step="0.01" value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min="0" step="0.01" value={item.rate}
                    onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2 text-sm font-medium px-1">${item.amount.toFixed(2)}</div>
                <div className="col-span-1">
                  <button onClick={() => removeItem(index)} className="p-1.5 text-muted hover:text-danger rounded" disabled={items.length <= 1}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Mobile stacked layout */}
              <div className="sm:hidden border border-border rounded-lg p-3 space-y-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="Item description"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted">Qty</label>
                    <input
                      type="number" min="1" step="0.01" value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Rate ($)</label>
                    <input
                      type="number" min="0" step="0.01" value={item.rate}
                      onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <label className="text-xs text-muted">Amount</label>
                      <p className="text-sm font-medium py-1.5">${item.amount.toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeItem(index)} className="p-1 text-muted hover:text-danger mb-1.5" disabled={items.length <= 1}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6">
          <h2 className="font-semibold mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Payment terms, thank you message, etc."
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
        </div>

        <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6">
          <h2 className="font-semibold mb-4">Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-sm gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted shrink-0">Discount</span>
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(e.target.value);
                    if (e.target.value === "none") setDiscountValue(0);
                  }}
                  className="px-2 py-1 border border-border rounded text-xs bg-white"
                >
                  <option value="none">None</option>
                  <option value="percentage">%</option>
                  <option value="fixed">$</option>
                </select>
                {discountType !== "none" && (
                  <input
                    type="number"
                    min="0"
                    max={discountType === "percentage" ? 100 : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-border rounded text-sm text-center"
                  />
                )}
              </div>
              {discountAmount > 0 && (
                <span className="text-danger shrink-0">-${discountAmount.toFixed(2)}</span>
              )}
            </div>

            {/* Tax */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted">Tax</span>
                <input
                  type="number" min="0" max="100" step="0.1" value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
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

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 order-3 sm:order-1"
        >
          Cancel
        </button>

        {/* Save action dropdown */}
        <div className="relative order-1 sm:order-3" ref={saveMenuRef}>
          <div className="flex">
            <button
              onClick={() => handleSubmit("draft")}
              disabled={saving}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-primary text-white rounded-l-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Invoice"}
            </button>
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              disabled={saving}
              className="px-2.5 py-2.5 bg-primary text-white rounded-r-lg text-sm hover:bg-primary-dark disabled:opacity-50 border-l border-white/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {showSaveMenu && (
            <div className="absolute right-0 bottom-full mb-1 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[200px]">
              <button
                onClick={() => handleSubmit("draft")}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm rounded-t-lg"
              >
                <span className="font-medium">Save as Draft</span>
                <p className="text-xs text-muted">Save without sending</p>
              </button>
              <button
                onClick={() => handleSubmit("sent")}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-t border-border rounded-b-lg"
              >
                <span className="font-medium">Save & Mark Sent</span>
                <p className="text-xs text-muted">Save and mark as sent</p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
