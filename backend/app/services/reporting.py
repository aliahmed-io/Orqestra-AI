"""Management report generation (PDF and CSV) for Orqestra AI."""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Tuple

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from sqlalchemy.orm import Session

from app.models import Dataset, ReportRecord
from app.services.ml_pipeline import get_predictions_dashboard
from app.services.process_mining import compute_bottlenecks, compute_overview_metrics, compute_variants
from app.services.recommendations import generate_recommendations


def _sanitize_pdf_text(text: str) -> str:
    """Replace non-latin1 characters cleanly for core PDF fonts."""
    return (
        text.replace("→", "->")
        .replace("—", "-")
        .replace("–", "-")
        .encode("latin-1", errors="replace")
        .decode("latin-1")
    )


def _line(pdf: FPDF, height: float, text: str) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, height, _sanitize_pdf_text(text), new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def generate_pdf_report(db: Session, dataset_id: int) -> Tuple[bytes, str, ReportRecord]:
    """Generate a comprehensive PDF management report and log a ReportRecord."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if dataset is None:
        raise ValueError(f"Dataset {dataset_id} not found")

    overview = compute_overview_metrics(db, dataset_id)
    bottlenecks = compute_bottlenecks(db, dataset_id)
    variants = compute_variants(db, dataset_id)
    ml_dash = get_predictions_dashboard(db, dataset_id)
    recs = generate_recommendations(db, dataset_id)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(36, 43, 58)  # Ink #242B3A
    _line(pdf, 10, "Orqestra AI - Process Intelligence Report")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 102, 125)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    _line(pdf, 6, f"Dataset: {dataset.name} | Process: {dataset.process_type} | Generated: {generated_at}")
    pdf.ln(4)

    # 1. Process Overview & KPIs
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(53, 77, 138)  # Indigo #354D8A
    _line(pdf, 8, "1. Process Overview & Performance Metrics")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(36, 43, 58)
    kpi_lines = [
        f"Total Cases: {overview['total_cases']} (Completed: {overview['completed_cases']}, Open: {overview['open_cases']}, Rejected: {overview['rejected_cases']}, Cancelled: {overview['cancelled_cases']})",
        f"Median Cycle Time: {overview['median_cycle_time_hours']} hours | P90 Cycle Time: {overview['p90_cycle_time_hours']} hours",
        f"Delayed Cases: {overview['delayed_cases']} ({overview['delayed_rate']}%) | Rework Frequency: {overview['rework_frequency']}% ({overview['rework_cases']} cases)",
        f"Primary Bottleneck Stage: {overview['main_bottleneck_stage'] or 'N/A'} (Median Wait: {overview['main_bottleneck_median_hours'] or 0} hours)",
    ]
    for line in kpi_lines:
        _line(pdf, 6, line)
    pdf.ln(3)

    # 2. Bottleneck Rankings
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(53, 77, 138)
    _line(pdf, 8, "2. Bottleneck Stage Rankings")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(36, 43, 58)
    for idx, bn in enumerate(bottlenecks[:6], start=1):
        line = (
            f"{idx}. {bn['activity']} - Median Wait: {bn['median_wait_hours']}h | "
            f"P90: {bn['p90_wait_hours']}h | Cases: {bn['affected_cases']} | Rework: {bn['rework_frequency']}%"
        )
        _line(pdf, 5.5, line)
    pdf.ln(3)

    # 3. Top Process Variants
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(53, 77, 138)
    _line(pdf, 8, "3. Top Process Variants")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(36, 43, 58)
    for var in variants[:5]:
        line = f"[{var['variant_id']}] {var['case_count']} cases ({var['case_percentage']}%) | Median: {var['median_cycle_time_hours']}h | Path: {var['signature']}"
        _line(pdf, 5, line)
    pdf.ln(3)

    # 4. ML Delay Prediction Summary
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(53, 77, 138)
    _line(pdf, 8, "4. AI Delay Prediction Evaluation & Open Risk")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(36, 43, 58)
    for m in ml_dash.get("models", []):
        active_tag = " [ACTIVE]" if m["is_active"] else ""
        line = (
            f"- {m['model_name']}{active_tag}: F1={m['f1_score']}, PR-AUC={m['pr_auc']}, "
            f"ROC-AUC={m['roc_auc']}, Brier={m['brier_score']}"
        )
        _line(pdf, 5.5, line)
    preds = ml_dash.get("predictions", [])
    high_risk = sum(1 for p in preds if p["risk_tier"] == "high")
    _line(pdf, 5.5, f"Open cases scored: {len(preds)} | High-risk cases (>=65% delay prob): {high_risk}")
    pdf.ln(3)

    # 5. Suggested Improvements
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(53, 77, 138)
    _line(pdf, 8, "5. Evidence-Based Recommendations")
    pdf.set_text_color(36, 43, 58)
    for rec in recs:
        pdf.set_font("Helvetica", "B", 9)
        _line(pdf, 5, f"[{rec['severity'].upper()}] {rec['title']}")
        pdf.set_font("Helvetica", "", 9)
        _line(pdf, 5, f"Observation: {rec['observation']}")
        _line(pdf, 5, f"Action: {rec['suggested_action']}")
        pdf.ln(1)

    # 6. Analytical Limitations
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(53, 77, 138)
    _line(pdf, 8, "6. Analytical Limitations")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(36, 43, 58)
    limitations = [
        f"- {overview['measurement_note']}",
        f"- Delay Definition: {ml_dash['delay_definition']}",
        "- Recommendations reflect statistical associations in historical logs and do not establish causal proof.",
    ]
    for lim in limitations:
        _line(pdf, 5, lim)

    pdf_bytes = bytes(pdf.output())
    filename = f"orqestra_report_dataset_{dataset_id}.pdf"
    rec_db = ReportRecord(
        dataset_id=dataset_id,
        title=f"{dataset.name} Management Report",
        report_format="pdf",
        file_size_bytes=len(pdf_bytes),
    )
    db.add(rec_db)
    db.commit()
    db.refresh(rec_db)
    return pdf_bytes, filename, rec_db


def generate_csv_report(db: Session, dataset_id: int) -> Tuple[bytes, str, ReportRecord]:
    """Generate a structured CSV management summary report and log a ReportRecord."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if dataset is None:
        raise ValueError(f"Dataset {dataset_id} not found")

    overview = compute_overview_metrics(db, dataset_id)
    bottlenecks = compute_bottlenecks(db, dataset_id)
    variants = compute_variants(db, dataset_id)
    ml_dash = get_predictions_dashboard(db, dataset_id)
    recs = generate_recommendations(db, dataset_id)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Section", "Key / Item", "Value", "Details"])

    writer.writerow(["Overview", "Dataset", dataset.name, dataset.process_type])
    writer.writerow(["Overview", "Total Cases", overview["total_cases"], f"Completed={overview['completed_cases']}, Open={overview['open_cases']}"])
    writer.writerow(["Overview", "Median Cycle Time (h)", overview["median_cycle_time_hours"], f"P90={overview['p90_cycle_time_hours']}h"])
    writer.writerow(["Overview", "Delayed Rate (%)", overview["delayed_rate"], f"Delayed Cases={overview['delayed_cases']}"])
    writer.writerow(["Overview", "Rework Frequency (%)", overview["rework_frequency"], f"Rework Cases={overview['rework_cases']}"])

    for bn in bottlenecks:
        writer.writerow(["Bottleneck", bn["activity"], f"Median={bn['median_wait_hours']}h", f"P90={bn['p90_wait_hours']}h, Cases={bn['affected_cases']}, Rework={bn['rework_frequency']}%"])

    for var in variants[:10]:
        writer.writerow(["Variant", var["variant_id"], f"{var['case_count']} cases ({var['case_percentage']}%)", f"Median={var['median_cycle_time_hours']}h | {var['signature']}"])

    for p in ml_dash.get("predictions", []):
        writer.writerow(["Delay Prediction", p["case_key"], f"Prob={p['predicted_probability']} ({p['risk_tier']})", f"Stage={p['current_stage']}, Elapsed={p['elapsed_hours']}h"])

    for r in recs:
        writer.writerow(["Recommendation", r["title"], r["severity"], r["observation"]])

    writer.writerow(["Limitations", "Measurement", overview["measurement_note"], ml_dash["delay_definition"]])

    csv_bytes = buf.getvalue().encode("utf-8")
    filename = f"orqestra_report_dataset_{dataset_id}.csv"
    rec_db = ReportRecord(
        dataset_id=dataset_id,
        title=f"{dataset.name} Summary Export",
        report_format="csv",
        file_size_bytes=len(csv_bytes),
    )
    db.add(rec_db)
    db.commit()
    db.refresh(rec_db)
    return csv_bytes, filename, rec_db
