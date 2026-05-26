"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  logoUrl: string;
}

export default function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => {
        setOrgs(data.organizations || []);
        setActiveOrgId(data.activeOrgId || null);
      });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function switchOrg(id: string) {
    if (id === activeOrgId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    await fetch("/api/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeOrgId: id }),
    });
    setActiveOrgId(id);
    setOpen(false);
    setSwitching(false);
    router.refresh();
  }

  const active = orgs.find((o) => o.id === activeOrgId);

  if (orgs.length === 0) return null;

  if (collapsed) {
    return (
      <div className="px-2 py-2 border-b border-white/10">
        <div
          className="w-10 h-10 mx-auto rounded-lg bg-white/10 flex items-center justify-center text-white text-sm font-bold overflow-hidden"
          title={active?.name}
        >
          {active?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.logoUrl} alt={active.name} className="w-full h-full object-cover" />
          ) : (
            (active?.name || "?").charAt(0).toUpperCase()
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-white/10 relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 text-left transition disabled:opacity-50"
      >
        <div className="w-7 h-7 shrink-0 rounded bg-white/10 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
          {active?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.logoUrl} alt={active.name} className="w-full h-full object-cover" />
          ) : (
            (active?.name || "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/50 uppercase tracking-wide">Organization</p>
          <p className="text-sm font-medium text-white truncate">{active?.name || "—"}</p>
        </div>
        <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white text-foreground border border-border rounded-lg shadow-xl z-50 py-1 max-h-[60vh] overflow-y-auto">
          <p className="px-3 py-1.5 text-[10px] font-medium text-muted uppercase tracking-wide">Switch organization</p>
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => switchOrg(o.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm ${
                o.id === activeOrgId ? "bg-gray-50" : ""
              }`}
            >
              <div className="w-6 h-6 shrink-0 rounded bg-gray-200 flex items-center justify-center text-xs font-bold overflow-hidden">
                {o.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.logoUrl} alt={o.name} className="w-full h-full object-cover" />
                ) : (
                  o.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === activeOrgId && (
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-border mt-1">
            <Link
              href="/settings?tab=organizations"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Manage organizations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
