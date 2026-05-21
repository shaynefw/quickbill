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

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "appearance" | "email">("company");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/email-templates").then((r) => r.json()).then(setTemplates);
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) {
      setSettings((prev) => prev ? { ...prev, logoUrl: data.url } : prev);
    }
    setUploading(false);
  }

  async function saveTemplate(template: EmailTemplate) {
    await fetch(`/api/email-templates/${template.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    alert("Template saved!");
  }

  if (!settings) return <p className="text-muted">Loading...</p>;

  const tabs = [
    { id: "company" as const, label: "Company Info" },
    { id: "appearance" as const, label: "Appearance" },
    { id: "email" as const, label: "Email Templates" },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 bg-card-bg rounded-lg border border-border p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
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
        <div className="bg-card-bg rounded-xl border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="Your Company LLC"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
        <div className="bg-card-bg rounded-xl border border-border p-6 space-y-6">
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Invoice Colors</label>
            <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
