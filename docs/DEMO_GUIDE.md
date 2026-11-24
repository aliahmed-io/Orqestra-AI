# Orqestra AI — Demonstration Guide

1. **Executive Overview (`/`)**: Review the auto-seeded *Purchase Request Approvals (Sample)* dataset (260 cases, ~1,100+ events). Inspect Total Cases, Median & P90 Cycle Time, Delayed Cases, Rework Frequency, Weekly Trend, and Primary Bottleneck Stage.
2. **Process Discovery Studio (`/studio`)**: Explore the interactive Directly-Follows Graph. Click **Highlight Common Path** to isolate the standard happy path, adjust **Min Path Frequency** to simplify dense transitions, filter by **Department**, and click **Finance Review** to inspect incoming/outgoing transitions in the contextual detail panel.
3. **Case Explorer (`/cases`)**: Toggle **Delayed only** or search for a Case ID (e.g., `PR-1005`), then click any row to inspect its chronological event timeline and see how it compares to the standard process variant.
4. **Bottleneck Intelligence (`/bottlenecks`)**: Compare median vs. P90 waiting times across stages and inspect department-level queue disparities.
5. **Variant Explorer (`/variants`)**: Select two variants (e.g., the standard path vs. a rework loop variant) to compare their activity sequences, cycle times, and delay rates side by side.
6. **AI Delay Prediction (`/predictions`)**: Review the 3-model benchmark (Logistic Regression, Random Forest, HistGradientBoosting), probability calibration curve, top predictive signals, and the prioritized open-case delay risk queue.
7. **Recommendations (`/recommendations`) & Reports (`/reports`)**: Review evidence-linked improvement suggestions and export a management **PDF** or **CSV** report.
8. **Import Custom CSV**: Click **Import Event Log** in the top bar to upload your own CSV with `case_id`, `activity`, and `timestamp` columns.
