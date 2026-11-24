"""Event-log CSV ingestion, validation, case grouping, and deterministic ordering."""
from __future__ import annotations

import hashlib
import io
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Dataset, ProcessCase, ProcessDefinition, ProcessEvent


COLUMN_ALIASES: dict[str, list[str]] = {
    "case_id": ["case_id", "case id", "caseid", "case", "instance_id"],
    "activity": ["activity", "activity name", "activity_name", "stage", "step", "event"],
    "timestamp": ["timestamp", "time", "event_time", "created_at", "date"],
    "department": ["department", "dept", "division"],
    "responsible_team": ["responsible_team", "responsible team", "team", "group"],
    "process_type": ["process_type", "process type", "process", "workflow"],
    "event_outcome": ["event_outcome", "event outcome", "outcome", "result"],
    "priority": ["priority", "urgency", "severity"],
    "cost": ["cost", "amount", "value", "price"],
    "assigned_role": ["assigned_role", "assigned role", "role", "resource"],
    "deadline": ["deadline", "due_date", "due date", "sla_deadline"],
}

TERMINAL_COMPLETED = {"completed", "complete", "done", "fulfilled", "closed"}
TERMINAL_REJECTED = {"rejected", "reject", "denied"}
TERMINAL_CANCELLED = {"cancelled", "canceled", "aborted", "withdrawn"}


class IngestionValidationError(ValueError):
    """Raised when an imported CSV fails structural or data validation."""


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Map flexible header names to canonical internal column names."""
    lower_map = {str(col).strip().lower(): col for col in df.columns}
    rename_dict: dict[str, str] = {}

    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower_map:
                rename_dict[lower_map[alias]] = canonical
                break

    df = df.rename(columns=rename_dict)
    missing = [req for req in ("case_id", "activity", "timestamp") if req not in df.columns]
    if missing:
        raise IngestionValidationError(
            f"Missing required column(s): {', '.join(missing)}. "
            "Every event log must include Case ID, Activity name, and Timestamp."
        )
    return df


def _to_utc_datetime(val: object) -> Optional[datetime]:
    """Parse a timestamp value into a timezone-aware UTC datetime."""
    if pd.isna(val) or val is None or str(val).strip() == "":
        return None
    ts = pd.to_datetime(val, utc=True, errors="coerce")
    if pd.isna(ts):
        return None
    return ts.to_pydatetime()


def _infer_case_status(activities: list[str], outcomes: list[Optional[str]]) -> str:
    """Infer case terminal or open status from the final event activity/outcome."""
    if not activities:
        return "open"
    last_act = activities[-1].strip().lower()
    last_out = (outcomes[-1] or "").strip().lower()

    if last_act in TERMINAL_REJECTED or last_out in TERMINAL_REJECTED:
        return "rejected"
    if last_act in TERMINAL_CANCELLED or last_out in TERMINAL_CANCELLED:
        return "cancelled"
    if last_act in TERMINAL_COMPLETED or last_out in TERMINAL_COMPLETED:
        return "completed"
    return "open"


def _compute_variant_id(signature: str) -> str:
    """Deterministic short hash for a process variant signature."""
    return "V-" + hashlib.sha1(signature.encode("utf-8")).hexdigest()[:8].upper()


def ingest_csv_bytes(
    db: Session,
    csv_bytes: bytes,
    dataset_name: str,
    description: Optional[str] = None,
    process_type_default: str = "Purchase Request Approval",
) -> Dataset:
    """Parse, validate, and persist a CSV event log into the database."""
    dataset = Dataset(
        name=dataset_name,
        description=description,
        process_type=process_type_default,
        status="processing",
    )
    db.add(dataset)
    db.flush()

    try:
        raw_df = pd.read_csv(io.BytesIO(csv_bytes))
        if raw_df.empty:
            raise IngestionValidationError("Uploaded CSV file contains no rows.")
        if len(raw_df) > settings.max_upload_rows:
            raise IngestionValidationError(
                f"CSV exceeds maximum supported rows ({settings.max_upload_rows})."
            )

        df = _normalize_columns(raw_df)
        df["_orig_order"] = range(len(df))

        # Validate required fields per row
        df["case_id"] = df["case_id"].astype(str).str.strip()
        df["activity"] = df["activity"].astype(str).str.strip()
        df = df[(df["case_id"] != "") & (df["case_id"] != "nan") & (df["activity"] != "") & (df["activity"] != "nan")]

        if df.empty:
            raise IngestionValidationError("No valid rows remain after removing empty case_id/activity entries.")

        # Parse timestamps and drop invalid timestamps while tracking count
        df["_parsed_ts"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
        invalid_ts_count = int(df["_parsed_ts"].isna().sum())
        df = df.dropna(subset=["_parsed_ts"]).copy()
        if df.empty:
            raise IngestionValidationError("All rows had unparseable timestamps.")

        if "deadline" in df.columns:
            df["_parsed_deadline"] = pd.to_datetime(df["deadline"], utc=True, errors="coerce")
        else:
            df["_parsed_deadline"] = pd.NaT

        has_deadlines = bool(df["_parsed_deadline"].notna().any())

        # Deterministic sort by case_id, timestamp, original row order
        df = df.sort_values(["case_id", "_parsed_ts", "_orig_order"], kind="mergesort")

        # Determine reference "now" as max timestamp in dataset for open-case elapsed checks
        dataset_max_ts: datetime = df["_parsed_ts"].max().to_pydatetime()

        process_types_seen: set[str] = set()
        cases_created = 0
        events_created = 0

        for case_key, group in df.groupby("case_id", sort=False):
            group = group.reset_index(drop=True)
            activities = group["activity"].tolist()
            outcomes = [
                None if ("event_outcome" not in group.columns or pd.isna(v) or str(v).strip() == "") else str(v).strip()
                for v in (group["event_outcome"].tolist() if "event_outcome" in group.columns else [None] * len(group))
            ]

            status = _infer_case_status(activities, outcomes)
            start_time: datetime = group["_parsed_ts"].iloc[0].to_pydatetime()
            end_time: Optional[datetime] = group["_parsed_ts"].iloc[-1].to_pydatetime() if status != "open" else None
            last_event_time: datetime = group["_parsed_ts"].iloc[-1].to_pydatetime()

            # Cycle time in hours (for closed cases, start->end; for open cases, start->last observed event)
            cycle_time_hours = round((last_event_time - start_time).total_seconds() / 3600.0, 2)

            # Rework count: number of repeated activity occurrences beyond first appearance
            seen_acts: set[str] = set()
            rework_count = 0
            for act in activities:
                if act in seen_acts:
                    rework_count += 1
                else:
                    seen_acts.add(act)

            signature = " -> ".join(activities)
            variant_id = _compute_variant_id(signature)

            # Optional case-level attributes (first non-null value)
            def first_non_null(col: str) -> Optional[str]:
                if col not in group.columns:
                    return None
                vals = group[col].dropna().astype(str).str.strip()
                vals = vals[vals != ""]
                return str(vals.iloc[0]) if not vals.empty else None

            dept = first_non_null("department")
            prio = first_non_null("priority")
            proc_type = first_non_null("process_type") or process_type_default
            process_types_seen.add(proc_type)

            # Cost: take max or first non-null numeric cost for the case
            total_cost: Optional[float] = None
            if "cost" in group.columns:
                cost_vals = pd.to_numeric(group["cost"], errors="coerce").dropna()
                if not cost_vals.empty:
                    total_cost = round(float(cost_vals.iloc[0]), 2)

            # Deadline
            deadline_vals = group["_parsed_deadline"].dropna()
            case_deadline: Optional[datetime] = deadline_vals.iloc[0].to_pydatetime() if not deadline_vals.empty else None

            # Delay evaluation
            is_delayed = False
            delay_reason: Optional[str] = None
            eval_end = end_time if end_time is not None else dataset_max_ts
            if case_deadline is not None:
                if eval_end > case_deadline:
                    is_delayed = True
                    delay_reason = "Exceeded explicit case deadline"
            else:
                elapsed_from_start = (eval_end - start_time).total_seconds() / 3600.0
                if elapsed_from_start > settings.default_sla_hours:
                    is_delayed = True
                    delay_reason = f"Exceeded default {settings.default_sla_hours:.0f}h SLA threshold (no explicit deadline)"

            case_obj = ProcessCase(
                dataset_id=dataset.id,
                case_key=str(case_key),
                process_type=proc_type,
                department=dept,
                priority=prio,
                status=status,
                is_delayed=is_delayed,
                delay_reason=delay_reason,
                start_time=start_time,
                end_time=end_time,
                deadline=case_deadline,
                cycle_time_hours=cycle_time_hours,
                rework_count=rework_count,
                event_count=len(group),
                variant_id=variant_id,
                variant_signature=signature,
                total_cost=total_cost,
            )
            db.add(case_obj)
            db.flush()
            cases_created += 1

            prev_ts: Optional[datetime] = None
            for seq_idx, row in group.iterrows():
                ts = row["_parsed_ts"].to_pydatetime()
                wait_hours: Optional[float] = None
                if prev_ts is not None:
                    wait_hours = round(max(0.0, (ts - prev_ts).total_seconds() / 3600.0), 2)
                prev_ts = ts

                def opt_str(col: str) -> Optional[str]:
                    if col not in group.columns or pd.isna(row[col]):
                        return None
                    s = str(row[col]).strip()
                    return s if s and s.lower() != "nan" else None

                cost_val: Optional[float] = None
                if "cost" in group.columns and not pd.isna(row["cost"]):
                    try:
                        cost_val = float(row["cost"])
                    except (ValueError, TypeError):
                        cost_val = None

                dl_val = row["_parsed_deadline"].to_pydatetime() if not pd.isna(row["_parsed_deadline"]) else None

                ev = ProcessEvent(
                    dataset_id=dataset.id,
                    case_id=case_obj.id,
                    activity=str(row["activity"]),
                    timestamp=ts,
                    sequence_index=int(seq_idx),
                    department=opt_str("department"),
                    responsible_team=opt_str("responsible_team"),
                    outcome=opt_str("event_outcome"),
                    priority=opt_str("priority"),
                    cost=cost_val,
                    assigned_role=opt_str("assigned_role"),
                    deadline=dl_val,
                    wait_from_prev_hours=wait_hours,
                )
                db.add(ev)
                events_created += 1

        # Create ProcessDefinition record
        proc_def = ProcessDefinition(
            dataset_id=dataset.id,
            name=", ".join(sorted(process_types_seen)) if process_types_seen else process_type_default,
            expected_activities_json=[
                "Request Submitted",
                "Manager Review",
                "Finance Review",
                "Procurement",
                "Completed",
            ],
            sla_hours=settings.default_sla_hours,
        )
        db.add(proc_def)

        dataset.status = "ready"
        dataset.row_count = events_created
        dataset.case_count = cases_created
        dataset.has_deadlines = has_deadlines
        if invalid_ts_count > 0:
            dataset.error_message = f"Skipped {invalid_ts_count} row(s) with invalid/missing timestamps."

        db.commit()
        db.refresh(dataset)
        return dataset

    except Exception as exc:
        db.rollback()
        # Persist failed status in a fresh transaction
        failed_ds = db.query(Dataset).filter(Dataset.id == dataset.id).first()
        if failed_ds is None:
            failed_ds = Dataset(
                name=dataset_name,
                description=description,
                process_type=process_type_default,
                status="failed",
                error_message=str(exc),
            )
            db.add(failed_ds)
        else:
            failed_ds.status = "failed"
            failed_ds.error_message = str(exc)
        db.commit()
        raise IngestionValidationError(str(exc)) from exc
