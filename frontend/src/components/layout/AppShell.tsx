"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  FileText,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  Network,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { useDataset } from "./DatasetContext";
import { ImportDatasetModal } from "@/components/ImportDatasetModal";

const NAV_GROUPS = [
  {
    title: "Discovery",
    items: [
      { href: "/overview", label: "Executive Overview", icon: LayoutDashboard },
      { href: "/studio", label: "Process Discovery Studio", icon: Network },
      { href: "/cases", label: "Case Explorer", icon: ListChecks },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/bottlenecks", label: "Bottleneck Intelligence", icon: AlertTriangle },
      { href: "/variants", label: "Variant Explorer", icon: GitBranch },
      { href: "/predictions", label: "AI Delay Prediction", icon: Activity },
    ],
  },
  {
    title: "Governance",
    items: [
      { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { datasets, activeDataset, activeDatasetId, setActiveDatasetId, loading } =
    useDataset();
  const [importOpen, setImportOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (pathname === "/") {
    return <>{children}</>;
  }

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-6 px-3 py-5" aria-label="Primary Navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-2 text-[11px] font-semibold text-ink-muted/80">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-subtle text-indigo font-semibold"
                      : "text-ink-muted hover:bg-porcelain hover:text-ink"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-indigo" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-indigo" : "text-ink-muted"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-porcelain text-ink">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-hairline bg-porcelain-elevated lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-hairline px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo text-white shadow-xs">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-tight text-ink">
              Orqestra AI
            </div>
            <div className="text-[11px] text-ink-muted">
              Process Intelligence
            </div>
          </div>
        </div>

        {renderNav()}

        <div className="border-t border-hairline p-4">
          <div className="rounded-md border border-hairline/80 bg-porcelain p-3 text-[11px] text-ink-muted">
            <div className="font-semibold text-ink">Measurement Scope</div>
            <p className="mt-1 leading-relaxed">
              Single-timestamp logs measure observed inter-event waiting time, not
              hands-on working time.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-[1px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-porcelain-elevated shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-hairline px-5">
              <span className="font-display text-sm font-bold text-ink">
                Orqestra AI
              </span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-md p-1 text-ink-muted hover:bg-porcelain-recessed"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNav(() => setMobileNavOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hairline bg-porcelain-elevated/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-ink-muted hover:bg-porcelain-recessed lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="dataset-select"
                className="hidden text-xs font-medium text-ink-muted sm:inline"
              >
                Dataset
              </label>
              <select
                id="dataset-select"
                aria-label="Active dataset"
                disabled={loading || datasets.length === 0}
                value={activeDatasetId ?? ""}
                onChange={(e) => setActiveDatasetId(Number(e.target.value))}
                className="h-9 max-w-[270px] rounded-md border border-hairline bg-porcelain px-3 text-sm font-medium text-ink focus:border-indigo focus:outline-none"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.case_count} cases)
                  </option>
                ))}
              </select>
              {activeDataset && (
                <span className="hidden font-mono-num text-xs text-ink-muted md:inline">
                  {activeDataset.row_count.toLocaleString()} events
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-3.5 w-3.5 text-indigo" />
              <span>Import Event Log</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <ImportDatasetModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
