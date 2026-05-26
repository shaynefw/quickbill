"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
}

interface PresetItem {
  id: string;
  name: string;
  description: string;
  rate: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [presetItems, setPresetItems] = useState<PresetItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "appearance" | "email" | "presets" | "backup">("company");
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [backupSections, setBackupSections] = useState({
    clients: true,
    invoices: true,
    presets: true,
    appointments: true,
  });
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<Record<string, number> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/email-templates").then((r) => r.json()).then(setTemplates);
    fetch("/api/preset-items").then((r) => r.json()).then(setPresetItems);
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Settings saved");
      router.refresh();
    } else {
      showToast("Failed to save settings");
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      alert("Logo must be under 512KB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) {
      setSettings((prev) => prev ? { ...prev, logoUrl: data.url } : prev);
    } else if (data.error) {
      alert(data.error);
    }
    setUploading(false);
  }

  async function saveTemplate(template: EmailTemplate) {
    const res = await fetch(`/api/email-templates/${template.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    showToast(res.ok ? "Template saved" : "Failed to save template");
  }

  async function handlePresetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      description: form.get("description") as string,
      rate: parseFloat(form.get("rate") as string) || 0,
    };

    if (editingPreset) {
      await fetch(`/api/preset-items/${editingPreset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      showToast("Preset updated");
    } else {
      await fetch("/api/preset-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      showToast("Preset created");
    }

    setShowPresetForm(false);
    setEditingPreset(null);
    const res = await fetch("/api/preset-items");
    setPresetItems(await res.json());
  }

  async function deletePreset(id: string) {
    if (!confirm("Delete this preset item?")) return;
    await fetch(`/api/preset-items/${id}`, { method: "DELETE" });
    setPresetItems((prev) => prev.filter((p) => p.id !== id));
  }

  async function exportBackup() {
    setBackupLoading(true);
    try {
      const selected = Object.entries(backupSections)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (selected.length === 0) {
        alert("Please select at least one section to export.");
        setBackupLoading(false);
        return;
      }
      const res = await fetch(`/api/backup?sections=${selected.join(",")}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quickbill-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export backup");
    }
    setBackupLoading(false);
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.error) {
        alert(result.error);
      } else {
        setRestoreResult(result.imported);
        // Refresh presets list
        const presetsRes = await fetch("/api/preset-items");
        setPresetItems(await presetsRes.json());
        router.refresh();
      }
    } catch {
      alert("Invalid backup file. Please select a valid QuickBill backup.");
    }
    setRestoreLoading(false);
    // Reset file input
    e.target.value = "";
  }

  if (!settings) return <p className="text-muted">Loading...</p>;

  const tabs = [
    { id: "company" as const, label: "Company" },
    { id: "appearance" as const, label: "Appearance" },
    { id: "presets" as const, label: "Presets" },
    { id: "email" as const, label: "Email" },
    { id: "backup" as const, label: "Backup" },
  ];

  return (
    <div className="max-w-3xl">
      {toast && (
        <div className="fixed top-20 right-4 lg:top-6 z-50 bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 bg-card-bg rounded-lg border border-border p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-muted hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "company" && (
        <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="Your Company LLC"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="billing@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                value={settings.companyPhone}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              value={settings.companyAddress}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="123 Main St&#10;City, State 12345"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {activeTab === "appearance" && (
        <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <div className="relative">
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="h-16 object-contain border border-border rounded-lg p-2"
                  />
                  <button
                    onClick={() => setSettings({ ...settings, logoUrl: "" })}
                    className="absolute -top-2 -right-2 bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    x
                  </button>
                </div>
              ) : (
                <div className="h-16 w-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted text-xs">
                  No logo
                </div>
              )}
              <label className="px-4 py-2 border border-border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                {uploading ? "Uploading..." : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-muted mt-2">Max 512KB. PNG, JPEG, GIF, WebP, or SVG.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Invoice Colors</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Preview</label>
            <div
              className="border border-border rounded-lg p-6"
              style={{ borderTopColor: settings.primaryColor, borderTopWidth: "4px" }}
            >
              <div className="flex justify-between items-start">
                <div>
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="h-8 mb-2 object-contain" />
                  )}
                  <p className="font-bold" style={{ color: settings.primaryColor }}>
                    {settings.companyName || "Your Company"}
                  </p>
                </div>
                <p className="text-xl font-bold" style={{ color: settings.primaryColor }}>
                  INVOICE
                </p>
              </div>
              <div
                className="mt-4 px-3 py-2 rounded text-white text-xs font-medium"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Description &nbsp;&nbsp; Qty &nbsp;&nbsp; Rate &nbsp;&nbsp; Amount
              </div>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {activeTab === "presets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Create preset line items to quickly add to invoices.
            </p>
            <button
              onClick={() => { setEditingPreset(null); setShowPresetForm(true); }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Preset
            </button>
          </div>

          {showPresetForm && (
            <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6">
              <h3 className="font-semibold mb-4">
                {editingPreset ? "Edit Preset Item" : "New Preset Item"}
              </h3>
              <form onSubmit={handlePresetSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Preset name *</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingPreset?.name}
                      placeholder="e.g. Web Design"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rate ($) *</label>
                    <input
                      name="rate"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={editingPreset?.rate}
                      placeholder="150.00"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Item name *</label>
                  <p className="text-xs text-muted mb-1">This is what appears as the line item on the invoice.</p>
                  <input
                    name="description"
                    required
                    defaultValue={editingPreset?.description}
                    placeholder="e.g. Custom website design and development"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowPresetForm(false); setEditingPreset(null); }}
                    className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                  >
                    {editingPreset ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {presetItems.length === 0 && !showPresetForm ? (
            <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
              <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-muted mb-2">No preset items yet</p>
              <p className="text-sm text-muted">Add preset items to quickly fill invoices.</p>
            </div>
          ) : (
            <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
              {presetItems.map((preset, i) => (
                <div
                  key={preset.id}
                  className={`flex items-center justify-between p-4 ${
                    i < presetItems.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{preset.name}</p>
                    <p className="text-sm text-muted">{preset.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-medium">
                      ${preset.rate.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingPreset(preset); setShowPresetForm(true); }}
                        className="text-primary text-sm hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="text-danger text-sm hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "email" && (
        <div className="space-y-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-card-bg rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold">{template.name}</h3>
                <span className="text-xs bg-gray-100 text-muted px-2 py-0.5 rounded capitalize">
                  {template.type}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input
                    value={template.subject}
                    onChange={(e) => {
                      setTemplates((prev) =>
                        prev.map((t) =>
                          t.id === template.id ? { ...t, subject: e.target.value } : t
                        )
                      );
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Body</label>
                  <textarea
                    value={template.body}
                    onChange={(e) => {
                      setTemplates((prev) =>
                        prev.map((t) =>
                          t.id === template.id ? { ...t, body: e.target.value } : t
                        )
                      );
                    }}
                    rows={6}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">
                    Variables: {"{{invoiceNumber}}"}, {"{{clientName}}"}, {"{{companyName}}"}, {"{{total}}"}, {"{{dueDate}}"}
                  </p>
                  <button
                    onClick={() => saveTemplate(template)}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "backup" && (
        <div className="space-y-6">
          {/* Export */}
          <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <h3 className="font-semibold">Export Backup</h3>
            </div>
            <p className="text-sm text-muted mb-4">
              Download a JSON file with your data. Choose what to include:
            </p>
            <div className="space-y-2 mb-5">
              {[
                { key: "clients" as const, label: "Clients", desc: "Names, emails, addresses, notes" },
                { key: "invoices" as const, label: "Invoices", desc: "All invoices with line items" },
                { key: "presets" as const, label: "Preset Items", desc: "Quick-add line item presets" },
                { key: "appointments" as const, label: "Appointments", desc: "Calendar appointments and schedule" },
              ].map((section) => (
                <label key={section.key} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupSections[section.key]}
                    onChange={(e) =>
                      setBackupSections((prev) => ({
                        ...prev,
                        [section.key]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 rounded border-border"
                  />
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted">{section.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={exportBackup}
              disabled={backupLoading}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {backupLoading ? "Exporting..." : "Download Backup"}
            </button>
          </div>

          {/* Import */}
          <div className="bg-card-bg rounded-xl border border-border p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <h3 className="font-semibold">Restore from Backup</h3>
            </div>
            <p className="text-sm text-muted mb-4">
              Import data from a QuickBill backup file. Existing records with the same email or invoice number will be skipped (no duplicates).
            </p>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-50">
              <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {restoreLoading ? "Importing..." : "Upload Backup File"}
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importBackup}
                disabled={restoreLoading}
              />
            </label>

            {restoreResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">Import complete!</p>
                <ul className="text-sm text-green-700 space-y-1">
                  {restoreResult.clients !== undefined && (
                    <li>{restoreResult.clients} new client{restoreResult.clients !== 1 ? "s" : ""} imported</li>
                  )}
                  {restoreResult.invoices !== undefined && (
                    <li>{restoreResult.invoices} new invoice{restoreResult.invoices !== 1 ? "s" : ""} imported</li>
                  )}
                  {restoreResult.presets !== undefined && (
                    <li>{restoreResult.presets} new preset{restoreResult.presets !== 1 ? "s" : ""} imported</li>
                  )}
                  {restoreResult.appointments !== undefined && (
                    <li>{restoreResult.appointments} new appointment{restoreResult.appointments !== 1 ? "s" : ""} imported</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
