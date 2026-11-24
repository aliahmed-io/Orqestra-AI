"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

interface StageSpecimen {
  id: string;
  label: string;
  x: number;
  y: number;
  cases: string;
  medianWait: string;
  note: string;
  isBottleneck?: boolean;
}

const SPECIMEN_STAGES: StageSpecimen[] = [
  {
    id: "submitted",
    label: "Request Submitted",
    x: 24,
    y: 90,
    cases: "260 cases (100%)",
    medianWait: "9.8h to Manager",
    note: "Entry event across 5 departments.",
  },
  {
    id: "manager",
    label: "Manager Review",
    x: 210,
    y: 90,
    cases: "260 cases (100%)",
    medianWait: "31.2h to Finance",
    note: "8% rejected directly at initial review.",
  },
  {
    id: "finance",
    label: "Finance Review",
    x: 396,
    y: 90,
    cases: "221 cases (85%)",
    medianWait: "38.4h to Procurement",
    note: "Primary bottleneck. 20% returned for clarification.",
    isBottleneck: true,
  },
  {
    id: "procurement",
    label: "Procurement",
    x: 210,
    y: 230,
    cases: "198 cases (76%)",
    medianWait: "13.1h to Completion",
    note: "Vendor sourcing and purchase order issuance.",
  },
  {
    id: "completed",
    label: "Completed",
    x: 396,
    y: 230,
    cases: "178 cases (68%)",
    medianWait: "Terminal stage",
    note: "Median end-to-end cycle time: 4.1 days.",
  },
];

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Deterministic Ingestion",
    body: "Upload any CSV event log with Case ID, Activity, and Timestamp. Orqestra orders events chronologically, computes inter-event waiting durations, and flags repeated-step rework.",
    stat: "0.02s / 1,000 events",
  },
  {
    num: "02",
    title: "Process Discovery Studio",
    body: "Reconstructs the actual Directly-Follows Graph with a deterministic layered layout. Filter by department, date range, or path density to isolate bottlenecks from noise.",
    stat: "Interactive DFG Canvas",
  },
  {
    num: "03",
    title: "Variant & Bottleneck Audit",
    body: "Groups cases by exact observed sequence to compare rework loops against the golden path. Distinguishes observed inter-event queue time from hands-on working time.",
    stat: "Median & P90 tails",
  },
  {
    num: "04",
    title: "Leakage-Free Delay Risk",
    body: "Benchmarks Logistic Regression, Random Forest, and HistGradientBoosting on chronological case-level splits using only prefix features available at prediction time.",
    stat: "PR-AUC & Calibration",
  },
];

const STAGE_RANGE_DATA = [
  { stage: "Finance Review", median: 38.4, p90: 61.2, cases: 221, bottleneck: true },
  { stage: "Manager Review", median: 31.2, p90: 49.5, cases: 260, bottleneck: false },
  { stage: "Returned to Manager", median: 16.4, p90: 27.1, cases: 52, bottleneck: false },
  { stage: "Procurement", median: 13.1, p90: 21.8, cases: 198, bottleneck: false },
  { stage: "Request Submitted", median: 9.8, p90: 16.4, cases: 260, bottleneck: false },
];

const DEPT_VARIANCE_DATA = [
  { dept: "IT Security", wait: 44.2, pct: 92 },
  { dept: "Marketing", wait: 39.8, pct: 83 },
  { dept: "Engineering", wait: 26.4, pct: 55 },
  { dept: "Human Resources", wait: 24.9, pct: 52 },
  { dept: "Operations", wait: 22.1, pct: 46 },
];

export default function LandingPage() {
  const [activeStageId, setActiveStageId] = useState<string>("finance");
  const [contrastMode, setContrastMode] = useState<"tracker" | "orqestra">("orqestra");
  const [workbenchTab, setWorkbenchTab] = useState<"bottlenecks" | "variants" | "ml">("bottlenecks");

  const activeStage =
    SPECIMEN_STAGES.find((s) => s.id === activeStageId) ?? SPECIMEN_STAGES[2]!;

  return (
    <div className="min-h-screen bg-porcelain text-ink">
      {/* Sticky Architectural Navigation */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-porcelain/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
            >
              <rect width="28" height="28" rx="6" fill="#354D8A" />
              <rect x="6" y="7" width="6" height="6" rx="1.5" fill="#F5F3EE" />
              <rect x="16" y="15" width="6" height="6" rx="1.5" fill="#ED9D78" />
              <path
                d="M12 10H19V15"
                stroke="#F5F3EE"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display text-base font-bold tracking-tight text-ink">
              Orqestra AI
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-muted md:flex">
            <a href="#contrast" className="transition-colors hover:text-ink">
              Why Event Logs
            </a>
            <a href="#pipeline" className="transition-colors hover:text-ink">
              Architecture
            </a>
            <a href="#workbench" className="transition-colors hover:text-ink">
              Diagnostics
            </a>
            <Link href="/studio" className="transition-colors hover:text-ink">
              Process Studio
            </Link>
          </nav>

          <Link
            href="/overview"
            className="inline-flex h-9 items-center rounded-md bg-indigo px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-hover"
          >
            Open Workspace
          </Link>
        </div>
      </header>

      {/* SECTION 1: Hero + Interactive SVG Process Specimen */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-6"
          >
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[58px]">
              Understand the work behind the work.
            </h1>
            <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-ink-muted sm:text-lg">
              Orqestra AI reconstructs how business processes actually execute
              from raw event logs — exposing hidden approval queues, rework
              loops, and cases likely to miss their deadlines before they slip.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/overview"
                className="inline-flex h-11 items-center rounded-md bg-indigo px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-hover"
              >
                Open Live Workspace
              </Link>
              <Link
                href="/studio"
                className="inline-flex h-11 items-center rounded-md border border-hairline bg-porcelain-elevated px-6 text-sm font-semibold text-ink transition-colors hover:bg-porcelain-recessed"
              >
                Launch Process Studio
              </Link>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 border-t border-hairline pt-6">
              <div>
                <div className="font-mono-num text-xl font-bold text-ink">260</div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  Sample cases seeded
                </div>
              </div>
              <div>
                <div className="font-mono-num text-xl font-bold text-ink">
                  3 models
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  Leakage-free ML benchmark
                </div>
              </div>
              <div>
                <div className="font-mono-num text-xl font-bold text-ink">
                  PDF + CSV
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  Vector diagram reports
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
            className="lg:col-span-6"
          >
            <div className="overflow-hidden rounded-lg border border-hairline bg-porcelain-elevated shadow-[0_4px_24px_rgba(36,43,58,0.06)]">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
                <span className="font-display text-xs font-semibold text-ink">
                  Purchase Request Approval — Interactive Specimen
                </span>
                <span className="font-mono-num text-[11px] text-ink-muted">
                  Click any stage
                </span>
              </div>

              <div className="bg-architectural-grid relative px-4 py-6">
                <svg
                  viewBox="0 0 560 300"
                  className="h-auto w-full select-none"
                  role="img"
                  aria-label="Interactive Purchase Request Process Specimen"
                >
                  <path d="M 164 114 L 210 114" stroke="#354D8A" strokeWidth="2" />
                  <path d="M 350 114 L 396 114" stroke="#354D8A" strokeWidth="2" />
                  <path
                    d="M 466 138 L 466 184 L 280 184 L 280 230"
                    fill="none"
                    stroke="#ED9D78"
                    strokeWidth="2.2"
                  />
                  <path d="M 350 254 L 396 254" stroke="#354D8A" strokeWidth="2" />
                  <path
                    d="M 466 90 C 466 36, 280 36, 280 90"
                    fill="none"
                    stroke="#ED9D78"
                    strokeWidth="1.8"
                    strokeDasharray="5 4"
                  />
                  <text
                    x="373"
                    y="44"
                    textAnchor="middle"
                    className="fill-ink-muted font-mono text-[10px]"
                  >
                    20% Returned to Manager
                  </text>

                  {SPECIMEN_STAGES.map((st) => {
                    const selected = st.id === activeStageId;
                    const stroke = selected
                      ? "#354D8A"
                      : st.isBottleneck
                      ? "#ED9D78"
                      : "#D4DCE8";
                    return (
                      <g
                        key={st.id}
                        transform={`translate(${st.x}, ${st.y})`}
                        onClick={() => setActiveStageId(st.id)}
                        className="cursor-pointer"
                      >
                        <rect
                          width="140"
                          height="48"
                          rx="6"
                          fill="#FFFFFF"
                          stroke={stroke}
                          strokeWidth={selected ? 2.2 : 1.4}
                        />
                        <rect
                          width="140"
                          height="4"
                          rx="2"
                          fill={st.isBottleneck ? "#ED9D78" : "#354D8A"}
                        />
                        <text
                          x="12"
                          y="23"
                          className="fill-ink font-sans text-[11px] font-semibold"
                        >
                          {st.label}
                        </text>
                        <text
                          x="12"
                          y="38"
                          className="fill-ink-muted font-mono text-[10px]"
                        >
                          {st.cases}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-hairline bg-porcelain px-5 py-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] text-ink-muted">Selected Stage</div>
                  <div className="mt-0.5 font-display text-sm font-bold text-ink">
                    {activeStage.label}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-muted">Observed Queue</div>
                  <div
                    className={`mt-0.5 font-mono-num text-sm font-semibold ${
                      activeStage.isBottleneck ? "text-amber-700" : "text-ink"
                    }`}
                  >
                    {activeStage.medianWait}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-muted">Diagnostic</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {activeStage.note}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: High-Contrast Ink Manifesto — Spreadsheets vs Process Intelligence */}
      <section id="contrast" className="bg-ink text-porcelain">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Spreadsheets track status. They hide friction.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-soft-slate">
              Most organizations manage approvals inside ticket queues and flat
              tables. You can see which requests are open, but you cannot see
              that one finance handoff adds 38 hours of idle wait or that 20% of
              cases bounce back to managers twice.
            </p>
            <div className="mt-8 inline-flex rounded-md border border-soft-slate/30 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setContrastMode("tracker")}
                className={`rounded px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  contrastMode === "tracker"
                    ? "bg-porcelain text-ink"
                    : "text-soft-slate hover:text-white"
                }`}
              >
                Flat Tracker View
              </button>
              <button
                type="button"
                onClick={() => setContrastMode("orqestra")}
                className={`rounded px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  contrastMode === "orqestra"
                    ? "bg-apricot text-ink"
                    : "text-soft-slate hover:text-white"
                }`}
              >
                Orqestra Reconstruction
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-lg border border-soft-slate/25 bg-[#1C222E]">
              <div className="flex items-center justify-between border-b border-soft-slate/20 px-5 py-3 text-xs text-soft-slate">
                <span className="font-mono-num">
                  {contrastMode === "tracker"
                    ? "export_requests_q1.csv (flat rows)"
                    : "Case PR-102 — Reconstructed Execution Timeline"}
                </span>
                <span className="font-mono-num">
                  {contrastMode === "tracker" ? "No path visibility" : "Rework detected"}
                </span>
              </div>

              {contrastMode === "tracker" ? (
                <div className="overflow-x-auto p-5 font-mono-num text-xs text-soft-slate">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-soft-slate/20 text-porcelain">
                        <th className="pb-2.5 pr-4">case_id</th>
                        <th className="pb-2.5 pr-4">activity</th>
                        <th className="pb-2.5 pr-4">timestamp</th>
                        <th className="pb-2.5">department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft-slate/10">
                      <tr>
                        <td className="py-2.5 pr-4">PR-102</td>
                        <td className="py-2.5 pr-4">Request Submitted</td>
                        <td className="py-2.5 pr-4">2026-01-12 09:00</td>
                        <td className="py-2.5">IT Security</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4">PR-102</td>
                        <td className="py-2.5 pr-4">Manager Review</td>
                        <td className="py-2.5 pr-4">2026-01-12 11:30</td>
                        <td className="py-2.5">IT Security</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4">PR-102</td>
                        <td className="py-2.5 pr-4">Finance Review</td>
                        <td className="py-2.5 pr-4">2026-01-14 04:10</td>
                        <td className="py-2.5">IT Security</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4">PR-102</td>
                        <td className="py-2.5 pr-4">Returned to Manager</td>
                        <td className="py-2.5 pr-4">2026-01-15 10:00</td>
                        <td className="py-2.5">IT Security</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4">PR-102</td>
                        <td className="py-2.5 pr-4">Completed</td>
                        <td className="py-2.5 pr-4">2026-01-18 15:20</td>
                        <td className="py-2.5">IT Security</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center gap-2 font-mono-num text-xs">
                    <span className="rounded border border-soft-slate/30 bg-white/5 px-2.5 py-1 text-porcelain">
                      Submitted
                    </span>
                    <span className="text-soft-slate">→ +2.5h →</span>
                    <span className="rounded border border-soft-slate/30 bg-white/5 px-2.5 py-1 text-porcelain">
                      Manager
                    </span>
                    <span className="text-apricot font-semibold">→ +40.7h →</span>
                    <span className="rounded border border-apricot bg-apricot/15 px-2.5 py-1 text-apricot">
                      Finance Review
                    </span>
                    <span className="text-apricot font-semibold">→ Rework →</span>
                    <span className="rounded border border-soft-slate/30 bg-white/5 px-2.5 py-1 text-porcelain">
                      Manager (2nd pass)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-soft-slate/20 pt-4 font-mono-num text-xs">
                    <div>
                      <div className="text-soft-slate">Total Cycle</div>
                      <div className="mt-1 text-base font-bold text-porcelain">
                        6.3 days
                      </div>
                    </div>
                    <div>
                      <div className="text-soft-slate">Rework Loops</div>
                      <div className="mt-1 text-base font-bold text-apricot">
                        1 loop (+48h)
                      </div>
                    </div>
                    <div>
                      <div className="text-soft-slate">SLA Status</div>
                      <div className="mt-1 text-base font-bold text-apricot">
                        Delayed (+30h)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 4-Stage Analytical Pipeline Index */}
      <section id="pipeline" className="border-b border-hairline bg-porcelain-elevated">
        <div className="mx-auto max-w-[1360px] px-6 py-20 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
              Four deterministic stages from raw CSV to executive action.
            </h2>
            <p className="mt-3 text-base text-ink-muted">
              Every chart, graph, and prediction in Orqestra AI derives strictly
              from imported event timestamps.
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-hairline border-t border-b border-hairline md:grid-cols-4 md:divide-x md:divide-y-0">
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.num}
                className="flex flex-col justify-between py-8 md:px-6 first:md:pl-0 last:md:pr-0"
              >
                <div>
                  <div className="font-mono-num text-xs font-semibold text-indigo">
                    {step.num}
                  </div>
                  <h3 className="mt-2.5 font-display text-lg font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
                <div className="mt-8 font-mono-num text-xs font-semibold text-ink">
                  {step.stat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Interactive Diagnostic Workbench */}
      <section id="workbench" className="border-b border-hairline bg-porcelain">
        <div className="mx-auto max-w-[1360px] px-6 py-20 lg:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
                Built to answer the questions leaders actually ask.
              </h2>
              <p className="mt-2 text-base text-ink-muted">
                Switch between views to inspect how Orqestra surfaces stage
                queues, variant penalties, and calibrated delay risk.
              </p>
            </div>

            <div className="inline-flex rounded-md border border-hairline bg-porcelain-elevated p-1">
              {(
                [
                  { id: "bottlenecks", label: "Bottleneck Tails" },
                  { id: "variants", label: "Variant Divergence" },
                  { id: "ml", label: "ML Delay Benchmark" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWorkbenchTab(tab.id)}
                  className={`rounded px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    workbenchTab === tab.id
                      ? "bg-indigo text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-hairline bg-porcelain-elevated p-6 lg:p-8">
            {workbenchTab === "bottlenecks" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      Stage Inter-Event Waiting Distribution (Median vs. P90)
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Distinguishes typical queue time from upper-percentile tail
                      delays.
                    </p>
                  </div>
                  <Link
                    href="/bottlenecks"
                    className="text-xs font-semibold text-indigo hover:underline"
                  >
                    Open Bottleneck Intelligence →
                  </Link>
                </div>

                <div className="space-y-4">
                  {STAGE_RANGE_DATA.map((row) => (
                    <div
                      key={row.stage}
                      className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-3">
                        <div className="text-sm font-semibold text-ink">
                          {row.stage}
                        </div>
                        <div className="font-mono-num text-[11px] text-ink-muted">
                          {row.cases} cases
                        </div>
                      </div>
                      <div className="sm:col-span-7">
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-porcelain-recessed">
                          {/* P90 tail */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-apricot/45"
                            style={{ width: `${(row.p90 / 70) * 100}%` }}
                          />
                          {/* Median bar */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              row.bottleneck ? "bg-apricot" : "bg-indigo"
                            }`}
                            style={{ width: `${(row.median / 70) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="font-mono-num text-xs text-ink sm:col-span-2 sm:text-right">
                        <strong>{row.median}h</strong>{" "}
                        <span className="text-ink-muted">/ {row.p90}h P90</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {workbenchTab === "variants" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      Standard Path vs. Rework Variant Penalty
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Exact activity sequences grouped and compared side by side.
                    </p>
                  </div>
                  <Link
                    href="/variants"
                    className="text-xs font-semibold text-indigo hover:underline"
                  >
                    Open Variant Explorer →
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-lg border border-indigo/30 bg-porcelain p-5">
                    <div className="flex items-center justify-between font-mono-num text-xs">
                      <span className="font-bold text-indigo">
                        Standard Path (V-4A81C2)
                      </span>
                      <span className="text-ink">3.1d median · 54% of cases</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                      {[
                        "Request Submitted",
                        "Manager Review",
                        "Finance Review",
                        "Procurement",
                        "Completed",
                      ].map((s, i, arr) => (
                        <React.Fragment key={s}>
                          <span className="rounded border border-hairline bg-white px-2.5 py-1 font-medium">
                            {s}
                          </span>
                          {i < arr.length - 1 && (
                            <span className="text-soft-slate">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-apricot bg-apricot-subtle/35 p-5">
                    <div className="flex items-center justify-between font-mono-num text-xs">
                      <span className="font-bold text-ink">
                        Rework Loop (V-9F4E12)
                      </span>
                      <span className="font-semibold text-amber-800">
                        6.4d median (+3.3d penalty)
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                      {[
                        "Submitted",
                        "Manager",
                        "Finance",
                        "Returned to Manager",
                        "Manager",
                        "Finance",
                        "Procurement",
                        "Completed",
                      ].map((s, i, arr) => (
                        <React.Fragment key={`${s}-${i}`}>
                          <span className="rounded border border-hairline bg-white px-2 py-1 font-medium">
                            {s}
                          </span>
                          {i < arr.length - 1 && (
                            <span className="text-apricot">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {workbenchTab === "ml" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      Leakage-Free Delay Prediction Benchmark
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Chronological 75/25 case-level split on prefix events only.
                    </p>
                  </div>
                  <Link
                    href="/predictions"
                    className="text-xs font-semibold text-indigo hover:underline"
                  >
                    Open AI Delay Prediction →
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    {
                      name: "HistGradientBoosting",
                      tag: "Best Composite",
                      f1: "0.81",
                      pr: "0.89",
                      roc: "0.87",
                      brier: "0.14",
                    },
                    {
                      name: "Random Forest",
                      tag: "Ensemble",
                      f1: "0.78",
                      pr: "0.86",
                      roc: "0.85",
                      brier: "0.16",
                    },
                    {
                      name: "Logistic Regression",
                      tag: "Linear Baseline",
                      f1: "0.74",
                      pr: "0.81",
                      roc: "0.80",
                      brier: "0.18",
                    },
                  ].map((m) => (
                    <div
                      key={m.name}
                      className="rounded-lg border border-hairline bg-porcelain p-5"
                    >
                      <div className="font-display text-sm font-bold text-ink">
                        {m.name}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-muted">{m.tag}</div>
                      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-hairline pt-3 font-mono-num text-xs">
                        <div>
                          <dt className="text-ink-muted">PR-AUC</dt>
                          <dd className="font-bold text-indigo">{m.pr}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">ROC-AUC</dt>
                          <dd className="font-bold text-ink">{m.roc}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">F1-Score</dt>
                          <dd className="font-semibold text-ink">{m.f1}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">Brier</dt>
                          <dd className="font-semibold text-ink">{m.brier}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5: Departmental Variance & Analytical Honesty */}
      <section className="border-b border-hairline bg-porcelain-elevated">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
              Honest statistics. Zero fabricated KPIs.
            </h2>
            <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-ink-muted">
              When an event log only records one timestamp per stage, Orqestra AI
              explicitly distinguishes observed inter-event waiting time from
              employee working time. Recommendations link directly to sample
              counts and percentiles — and never claim causation where only
              correlation exists.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 border-t border-hairline pt-6">
              <div>
                <div className="font-display text-sm font-bold text-ink">
                  Vector PDF Reports
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Exports process diagrams, bottleneck tables, variant rankings,
                  and analytical limitations in one click.
                </p>
              </div>
              <div>
                <div className="font-display text-sm font-bold text-ink">
                  Rule-Based Fallback
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Gracefully falls back to deterministic SLA thresholds when
                  historical sample counts are too small for ML.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-porcelain p-6 lg:col-span-6">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="font-display text-sm font-bold text-ink">
                Finance Review Wait by Department
              </span>
              <span className="font-mono-num text-xs text-ink-muted">
                Median hours
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {DEPT_VARIANCE_DATA.map((d) => (
                <div key={d.dept} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-ink">{d.dept}</span>
                    <span className="font-mono-num font-semibold text-ink">
                      {d.wait}h
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-porcelain-recessed">
                    <div
                      className={`h-full rounded-full ${
                        d.wait > 35 ? "bg-apricot" : "bg-indigo"
                      }`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Closing Call to Action */}
      <section className="bg-ink text-porcelain">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-8 px-6 py-20 lg:flex-row lg:items-center lg:px-10">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              See where your approvals actually stall.
            </h2>
            <p className="mt-3 max-w-xl text-base text-soft-slate">
              Explore the seeded 260-case Purchase Request dataset or drop your
              own CSV event log directly into the workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/overview"
              className="inline-flex h-11 items-center rounded-md bg-apricot px-6 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Open Live Workspace
            </Link>
            <Link
              href="/reports"
              className="inline-flex h-11 items-center rounded-md border border-soft-slate/40 px-6 text-sm font-semibold text-porcelain transition-colors hover:bg-white/10"
            >
              View Sample Reports
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-porcelain">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-4 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center lg:px-10">
          <div>Orqestra AI — Enterprise Process Intelligence Platform</div>
          <div className="flex flex-wrap gap-6">
            <Link href="/overview" className="hover:text-ink">
              Executive Overview
            </Link>
            <Link href="/studio" className="hover:text-ink">
              Process Studio
            </Link>
            <Link href="/cases" className="hover:text-ink">
              Case Explorer
            </Link>
            <Link href="/predictions" className="hover:text-ink">
              Delay Prediction
            </Link>
            <Link href="/reports" className="hover:text-ink">
              Reports
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
