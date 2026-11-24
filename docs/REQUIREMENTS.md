# Orqestra AI — Functional & Non-Functional Requirements

## Functional Requirements

1. **Event-Log Ingestion & Validation**
   - Import CSV event logs requiring `case_id`, `activity`, and `timestamp` (with flexible header aliases).
   - Support optional attributes: `department`, `responsible_team`, `process_type`, `event_outcome`, `priority`, `cost`, `assigned_role`, `deadline`.
   - Sort events chronologically per case, compute inter-event waiting times, detect rework loops, and infer terminal/open case status.
2. **Process Discovery Studio**
   - Generate a deterministic Directly-Follows Graph (DFG) from imported events.
   - Display node frequency, case counts, median wait to next stage, and bottleneck indicators.
   - Support zooming, panning, stage inspection, department/process filters, path density threshold, and common-path highlighting.
3. **Case Explorer**
   - Paginated, searchable, filterable case table (by Case ID, status, department, delayed-only).
   - Chronological event timeline inspection and deviation comparison against the standard process variant.
4. **Bottleneck Intelligence**
   - Rank stages by median and P90 inter-event waiting time, affected cases, and rework frequency.
   - Provide department-level comparisons.
5. **Process Variant Explorer**
   - Group cases by exact observed activity sequence and allow visual side-by-side comparison.
6. **AI Delay Prediction**
   - Train and benchmark Logistic Regression, Random Forest, and HistGradientBoosting using leakage-free prefix features and chronological case-level splits.
   - Score in-progress cases with probability, risk tier, confidence, and contributing factors, with a deterministic rule-based fallback.
7. **Recommendation Engine & Management Reports**
   - Generate evidence-linked improvement suggestions with explicit causation caveats.
   - Export management reports in PDF and CSV formats.

## Non-Functional Requirements

1. **Type Safety & Code Quality**: Strict TypeScript (`strict`, `noImplicitAny`, `noUncheckedIndexedAccess`), ESLint, and Pydantic v2 schema validation.
2. **Performance & Scalability**: Server-side pagination for large event logs, deterministic graph filtering for dense processes.
3. **Accessibility & Motion**: WCAG AA color contrast (`#242B3A` on `#F5F3EE`), keyboard focus management, `prefers-reduced-motion` support.
4. **Analytical Integrity**: No fabricated KPIs; explicit documentation of single-timestamp inter-event waiting time vs. hands-on processing time.
