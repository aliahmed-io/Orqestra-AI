"""Seeded synthetic purchase-request event log generator for Orqestra AI.

Generates realistic business process event logs with:
- Standard happy path: Request Submitted -> Manager Review -> Finance Review -> Procurement -> Completed
- Rework loops: Returned to Manager, Repeated Finance Check
- Rejections and Cancellations
- Delayed cases and Open/In-progress cases
- Multiple departments, priorities, teams, costs, and occasional missing optional fields
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import random
import csv


def generate_purchase_request_log(
    output_path: Path,
    num_cases: int = 260,
    seed: int = 42,
) -> Path:
    rng = random.Random(seed)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    departments = ["Engineering", "Operations", "Marketing", "IT Security", "Human Resources"]
    priorities = ["Low", "Medium", "High", "Critical"]
    teams = {
        "Engineering": "Eng-Ops",
        "Operations": "Supply-Chain",
        "Marketing": "Brand-Growth",
        "IT Security": "SecOps",
        "Human Resources": "People-Ops",
    }

    base_start = datetime(2026, 1, 5, 8, 0, tzinfo=timezone.utc)
    rows: list[dict[str, str]] = []

    for idx in range(1, num_cases + 1):
        case_id = f"PR-{1000 + idx}"
        dept = rng.choice(departments)
        priority = rng.choices(priorities, weights=[0.2, 0.45, 0.25, 0.10], k=1)[0]
        team = teams[dept]
        cost = round(rng.uniform(450.0, 48500.0), 2)

        # Spread case arrivals over ~90 days
        arrival_offset_hours = rng.uniform(0, 90 * 24)
        t = base_start + timedelta(hours=arrival_offset_hours)

        # SLA deadline: 5 days (120h) for Low/Medium, 3.5 days (84h) for High/Critical
        sla_hours = 84.0 if priority in ("High", "Critical") else 120.0
        deadline = t + timedelta(hours=sla_hours)

        # Determine case archetype
        roll = rng.random()
        is_open = idx > num_cases - 28  # Last 28 cases are in-progress/open

        events: list[tuple[str, datetime, str, str]] = []
        # 1. Request Submitted
        events.append(("Request Submitted", t, "Requester", "Submitted"))

        # Wait before Manager Review (2h - 18h)
        t = t + timedelta(hours=rng.uniform(2.0, 18.0))
        if is_open and rng.random() < 0.25:
            # Still at Manager Review
            events.append(("Manager Review", t, "Department Manager", "Pending"))
        else:
            events.append(("Manager Review", t, "Department Manager", "Approved"))

            if not is_open and roll < 0.08:
                # Rejected at Manager Review
                t = t + timedelta(hours=rng.uniform(1.0, 8.0))
                events.append(("Rejected", t, "Department Manager", "Rejected"))
            elif not is_open and roll < 0.13:
                # Cancelled by requester
                t = t + timedelta(hours=rng.uniform(3.0, 24.0))
                events.append(("Cancelled", t, "Requester", "Cancelled"))
            else:
                # Wait before Finance Review — main bottleneck! (especially for IT Security & Marketing or High cost)
                fin_wait_base = rng.uniform(14.0, 48.0)
                if dept in ("IT Security", "Marketing") or cost > 20000:
                    fin_wait_base *= rng.uniform(1.3, 2.2)
                t = t + timedelta(hours=fin_wait_base)

                if is_open and rng.random() < 0.50:
                    events.append(("Finance Review", t, "Finance Controller", "In Review"))
                else:
                    # Check for rework loop (Returned to Manager)
                    if roll >= 0.13 and roll < 0.33:
                        events.append(("Finance Review", t, "Finance Controller", "Returned"))
                        t = t + timedelta(hours=rng.uniform(8.0, 28.0))
                        events.append(("Returned to Manager", t, "Department Manager", "Clarification"))
                        t = t + timedelta(hours=rng.uniform(6.0, 20.0))
                        events.append(("Manager Review", t, "Department Manager", "Re-approved"))
                        t = t + timedelta(hours=rng.uniform(16.0, 52.0))
                        events.append(("Finance Review", t, "Finance Controller", "Approved"))
                    elif roll >= 0.33 and roll < 0.41:
                        # Repeated finance check
                        events.append(("Finance Review", t, "Finance Controller", "Escalated"))
                        t = t + timedelta(hours=rng.uniform(12.0, 36.0))
                        events.append(("Finance Review", t, "Senior Finance", "Approved"))
                    else:
                        events.append(("Finance Review", t, "Finance Controller", "Approved"))

                    if not is_open and roll >= 0.41 and roll < 0.46:
                        t = t + timedelta(hours=rng.uniform(2.0, 12.0))
                        events.append(("Rejected", t, "Finance Controller", "Budget Denied"))
                    elif not (is_open and len(events) >= 3 and events[-1][3] == "In Review"):
                        # Procurement stage
                        proc_wait = rng.uniform(10.0, 34.0)
                        if cost > 25000:
                            proc_wait *= 1.4
                        t = t + timedelta(hours=proc_wait)
                        if is_open:
                            events.append(("Procurement", t, "Procurement Specialist", "Vendor Sourcing"))
                        else:
                            events.append(("Procurement", t, "Procurement Specialist", "PO Issued"))
                            t = t + timedelta(hours=rng.uniform(4.0, 22.0))
                            events.append(("Completed", t, "Procurement Specialist", "Fulfilled"))

        # Write rows, intentionally omitting some optional fields on ~8% of rows
        for activity, ts, role, outcome in events:
            omit_optional = rng.random() < 0.08
            rows.append({
                "case_id": case_id,
                "activity": activity,
                "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "department": "" if omit_optional else dept,
                "responsible_team": "" if omit_optional else team,
                "process_type": "Purchase Request Approval",
                "event_outcome": outcome,
                "priority": priority,
                "cost": "" if omit_optional else str(cost),
                "assigned_role": role,
                "deadline": deadline.strftime("%Y-%m-%dT%H:%M:%SZ"),
            })

    fieldnames = [
        "case_id",
        "activity",
        "timestamp",
        "department",
        "responsible_team",
        "process_type",
        "event_outcome",
        "priority",
        "cost",
        "assigned_role",
        "deadline",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return output_path


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    out = root / "data" / "sample_purchase_requests.csv"
    generate_purchase_request_log(out)
    print(f"Generated sample dataset at {out}")
