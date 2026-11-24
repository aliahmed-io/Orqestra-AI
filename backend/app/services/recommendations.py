"""Evidence-based recommendation engine for Orqestra AI.

Derives actionable process improvement observations directly from computed
bottleneck, variant, rework, and ML prediction statistics without claiming causation.
"""
from __future__ import annotations

from typing import Any

import numpy as np
from sqlalchemy.orm import Session

from app.models import ProcessCase
from app.services.ml_pipeline import get_predictions_dashboard
from app.services.process_mining import compute_bottlenecks, compute_overview_metrics, compute_variants


CAUSATION_CAVEAT = (
    "Observational finding derived from historical event logs. Correlation in waiting time "
    "or rework does not prove causation; validate root causes with process owners."
)


def generate_recommendations(db: Session, dataset_id: int) -> list[dict[str, Any]]:
    """Produce ranked, evidence-backed process improvement recommendations."""
    overview = compute_overview_metrics(db, dataset_id)
    bottlenecks = compute_bottlenecks(db, dataset_id)
    variants = compute_variants(db, dataset_id)
    cases = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id).all()
    ml_dash = get_predictions_dashboard(db, dataset_id)

    recs: list[dict[str, Any]] = []

    # 1. Top Bottleneck Stage
    if bottlenecks:
        top_bn = bottlenecks[0]
        recs.append({
            "id": "rec-bottleneck-1",
            "category": "Bottleneck",
            "severity": "high",
            "title": f"Reduce inter-event waiting after '{top_bn['activity']}'",
            "observation": (
                f"'{top_bn['activity']}' exhibits the longest median waiting period to the next stage "
                f"at {top_bn['median_wait_hours']}h (P90: {top_bn['p90_wait_hours']}h) across {top_bn['affected_cases']} cases."
            ),
            "suggested_action": (
                f"Audit handoff queues and approval SLAs immediately following '{top_bn['activity']}', "
                "and consider automated pre-checks or parallel routing for standard-risk requests."
            ),
            "evidence": {
                "stage": top_bn["activity"],
                "median_wait_hours": top_bn["median_wait_hours"],
                "p90_wait_hours": top_bn["p90_wait_hours"],
                "affected_cases": top_bn["affected_cases"],
                "bottleneck_score": top_bn["bottleneck_score"],
            },
            "caveat": CAUSATION_CAVEAT,
        })

        # Check department variance within top bottleneck
        depts = top_bn.get("department_breakdown", [])
        if len(depts) >= 2:
            sorted_depts = sorted(depts, key=lambda d: d["median_wait_hours"], reverse=True)
            slowest = sorted_depts[0]
            fastest = sorted_depts[-1]
            if slowest["median_wait_hours"] > fastest["median_wait_hours"] * 1.35:
                recs.append({
                    "id": "rec-dept-variance",
                    "category": "Department Variance",
                    "severity": "medium",
                    "title": f"Address '{slowest['department']}' queue disparity at '{top_bn['activity']}'",
                    "observation": (
                        f"In '{top_bn['activity']}', {slowest['department']} has a median wait of "
                        f"{slowest['median_wait_hours']}h compared to {fastest['median_wait_hours']}h in {fastest['department']}."
                    ),
                    "suggested_action": (
                        f"Review workload allocation and approval thresholds for {slowest['department']} "
                        "to align queue responsiveness with peer departments."
                    ),
                    "evidence": {
                        "slowest_department": slowest["department"],
                        "slowest_median_hours": slowest["median_wait_hours"],
                        "fastest_department": fastest["department"],
                        "fastest_median_hours": fastest["median_wait_hours"],
                    },
                    "caveat": CAUSATION_CAVEAT,
                })

    # 2. Rework impact comparison
    rework_cycles = [c.cycle_time_hours for c in cases if c.rework_count > 0 and c.cycle_time_hours is not None]
    clean_cycles = [c.cycle_time_hours for c in cases if c.rework_count == 0 and c.cycle_time_hours is not None]
    if rework_cycles and clean_cycles:
        rw_med = round(float(np.median(rework_cycles)), 1)
        cl_med = round(float(np.median(clean_cycles)), 1)
        if rw_med > cl_med:
            recs.append({
                "id": "rec-rework-impact",
                "category": "Rework",
                "severity": "high",
                "title": "Eliminate upstream omissions driving approval rework loops",
                "observation": (
                    f"{overview['rework_frequency']}% of cases ({overview['rework_cases']} cases) contain rework loops. "
                    f"Cases with rework have a median cycle time of {rw_med}h vs {cl_med}h for first-pass cases."
                ),
                "suggested_action": (
                    "Introduce mandatory intake validation rules (budget code, vendor quote, cost center) "
                    "prior to Manager Review to prevent downstream returns."
                ),
                "evidence": {
                    "rework_frequency_pct": overview["rework_frequency"],
                    "rework_cases": overview["rework_cases"],
                    "rework_median_cycle_hours": rw_med,
                    "clean_median_cycle_hours": cl_med,
                    "cycle_time_multiplier": round(rw_med / max(1.0, cl_med), 2),
                },
                "caveat": CAUSATION_CAVEAT,
            })

    # 3. Variant concentration
    if len(variants) >= 2:
        top_var = variants[0]
        recs.append({
            "id": "rec-variant-standardization",
            "category": "Process Standardization",
            "severity": "low",
            "title": f"Standardize around dominant variant {top_var['variant_id']} ({top_var['case_percentage']}% of cases)",
            "observation": (
                f"Top variant {top_var['variant_id']} ({top_var['signature']}) accounts for {top_var['case_count']} cases "
                f"with a median cycle time of {top_var['median_cycle_time_hours']}h and {top_var['delayed_rate']}% delay rate."
            ),
            "suggested_action": (
                "Document this path as the golden reference workflow and investigate non-standard variants "
                "with elevated cycle times or rejection rates."
            ),
            "evidence": {
                "variant_id": top_var["variant_id"],
                "case_percentage": top_var["case_percentage"],
                "median_cycle_time_hours": top_var["median_cycle_time_hours"],
                "total_variants": len(variants),
            },
            "caveat": CAUSATION_CAVEAT,
        })

    # 4. ML High-Risk Open Cases
    high_risk = [p for p in ml_dash.get("predictions", []) if p["risk_tier"] == "high"]
    if high_risk:
        stage_counts: dict[str, int] = {}
        for p in high_risk:
            stage_counts[p["current_stage"]] = stage_counts.get(p["current_stage"], 0) + 1
        top_risk_stage = max(stage_counts.items(), key=lambda x: x[1])[0]
        recs.append({
            "id": "rec-ml-delay-risk",
            "category": "Predictive Delay Risk",
            "severity": "high",
            "title": f"Prioritize {len(high_risk)} high-risk open cases concentrated at '{top_risk_stage}'",
            "observation": (
                f"Delay prediction identifies {len(high_risk)} in-progress cases with >=65% probability of missing their deadline, "
                f"most commonly currently at '{top_risk_stage}' ({stage_counts[top_risk_stage]} cases)."
            ),
            "suggested_action": (
                f"Triage open cases at '{top_risk_stage}' ordered by predicted delay probability and elapsed hours."
            ),
            "evidence": {
                "high_risk_open_cases": len(high_risk),
                "concentrated_stage": top_risk_stage,
                "stage_high_risk_count": stage_counts[top_risk_stage],
            },
            "caveat": "Predictions are probabilistic estimates from historical prefixes and should guide triage, not replace human review.",
        })

    return recs
