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

export default function LandingPage() {
  const [activeStageId, setActiveStageId] = useState<string>("finance");
  const activeStage =
    SPECIMEN_STAGES.find((s) => s.id === activeStageId) ?? SPECIMEN_STAGES[2]!;

  return (
    <div className="min-h-screen bg-porcelain text-ink">
      {/* Top Architectural Navigation */}
      <header className="border-b border-hairline bg-porcelain">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6 lg:px-10">
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
            <Link href="/overview" className="transition-colors hover:text-ink">
              Executive Overview
            </Link>
            <Link href="/studio" className="transition-colors hover:text-ink">
              Process Studio
            </Link>
            <Link href="/predictions" className="transition-colors hover:text-ink">
              Delay Prediction
            </Link>
            <Link href="/reports" className="transition-colors hover:text-ink">
              Reports
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

      {/* Hero Section */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
          {/* Editorial Thesis (Left 6 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-6"
          >
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[54px]">
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

            {/* Grounded Telemetry Row */}
            <div className="mt-12 grid max-w-lg grid-cols-3 border-t border-hairline pt-6">
              <div>
                <div className="font-mono-num text-xl font-bold text-ink">
                  260
                </div>
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

          {/* Interactive Process Specimen (Right 6 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
            className="lg:col-span-6"
          >
            <div className="overflow-hidden rounded-lg border border-hairline bg-porcelain-elevated shadow-[0_4px_20px_rgba(36,43,58,0.05)]">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
                <span className="font-display text-xs font-semibold text-ink">
                  Purchase Request Approval — Interactive Specimen
                </span>
                <span className="font-mono-num text-[11px] text-ink-muted">
                  Click any stage
                </span>
              </div>

              {/* SVG Architectural Canvas */}
              <div className="bg-architectural-grid relative px-4 py-6">
                <svg
                  viewBox="0 0 560 300"
                  className="h-auto w-full select-none"
                  role="img"
                  aria-label="Interactive Purchase Request Process Specimen"
                >
                  {/* Standard Indigo Transitions */}
                  <path
                    d="M 164 114 L 210 114"
                    stroke="#354D8A"
                    strokeWidth="2"
                  />
                  <path
                    d="M 350 114 L 396 114"
                    stroke="#354D8A"
                    strokeWidth="2"
                  />
                  {/* Finance -> Procurement */}
                  <path
                    d="M 466 138 L 466 184 L 280 184 L 280 230"
                    fill="none"
                    stroke="#ED9D78"
                    strokeWidth="2.2"
                  />
                  {/* Procurement -> Completed */}
                  <path
                    d="M 350 254 L 396 254"
                    stroke="#354D8A"
                    strokeWidth="2"
                  />
                  {/* Rework Return Loop (Finance -> Manager) */}
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

                  {/* Stage Nodes */}
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

              {/* Live Readout Bar */}
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

      {/* 4-Stage Analytical Pipeline Index */}
      <section className="border-b border-hairline bg-porcelain-elevated">
        <div className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              Built for process diagnostics, not task lists.
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Every figure in the workspace is computed deterministically from
              your imported event logs.
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-hairline border-t border-b border-hairline md:grid-cols-4 md:divide-x md:divide-y-0">
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.num}
                className="flex flex-col justify-between py-6 md:px-6 first:md:pl-0 last:md:pr-0"
              >
                <div>
                  <div className="font-mono-num text-xs font-semibold text-indigo">
                    {step.num}
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
                <div className="mt-6 font-mono-num text-xs font-medium text-ink">
                  {step.stat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-4 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center lg:px-10">
        <div>Orqestra AI — Enterprise Process Intelligence</div>
        <div className="flex gap-6">
          <Link href="/overview" className="hover:text-ink">
            Workspace
          </Link>
          <Link href="/studio" className="hover:text-ink">
            Process Studio
          </Link>
          <Link href="/reports" className="hover:text-ink">
            Reports
          </Link>
        </div>
      </footer>
    </div>
  );
}
