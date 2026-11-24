"""Deterministic process-mining algorithms for Orqestra AI.

Computes Directly-Follows Graphs (DFG), deterministic layered graph layouts,
process variants, cycle times, inter-event waiting times, rework detection,
and statistically defensible bottleneck rankings.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.models import AnalysisRun, ProcessCase, ProcessEvent, ProcessMetric


def _percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    return round(float(np.percentile(values, q)), 2)


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(float(np.median(values)), 2)


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(float(np.mean(values)), 2)


def compute_overview_metrics(db: Session, dataset_id: int, persist: bool = False) -> dict[str, Any]:
    """Compute Executive Overview KPIs strictly from imported events and cases."""
    cases = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id).all()
    events = db.query(ProcessEvent).filter(ProcessEvent.dataset_id == dataset_id).order_by(ProcessEvent.case_id, ProcessEvent.sequence_index).all()

    total_cases = len(cases)
    completed_cases = sum(1 for c in cases if c.status == "completed")
    open_cases = sum(1 for c in cases if c.status == "open")
    rejected_cases = sum(1 for c in cases if c.status == "rejected")
    cancelled_cases = sum(1 for c in cases if c.status == "cancelled")
    delayed_cases = sum(1 for c in cases if c.is_delayed)
    rework_cases = sum(1 for c in cases if c.rework_count > 0)

    closed_cycle_times = [
        c.cycle_time_hours for c in cases
        if c.status != "open" and c.cycle_time_hours is not None
    ]
    all_cycle_times = [c.cycle_time_hours for c in cases if c.cycle_time_hours is not None]
    cycle_pool = closed_cycle_times if closed_cycle_times else all_cycle_times

    median_cycle = _median(cycle_pool)
    p90_cycle = _percentile(cycle_pool, 90)
    delayed_rate = round((delayed_cases / total_cases) * 100.0, 1) if total_cases > 0 else 0.0
    rework_freq = round((rework_cases / total_cases) * 100.0, 1) if total_cases > 0 else 0.0

    # Group events by case to compute stage waiting times
    events_by_case: dict[int, list[ProcessEvent]] = defaultdict(list)
    act_case_sets: dict[str, set[int]] = defaultdict(set)
    act_event_counts: Counter[str] = Counter()
    for ev in events:
        events_by_case[ev.case_id].append(ev)
        act_case_sets[ev.activity].add(ev.case_id)
        act_event_counts[ev.activity] += 1

    stage_waits: dict[str, list[float]] = defaultdict(list)
    for case_evs in events_by_case.values():
        for i in range(1, len(case_evs)):
            prev_ev = case_evs[i - 1]
            curr_ev = case_evs[i]
            if curr_ev.wait_from_prev_hours is not None:
                stage_waits[prev_ev.activity].append(curr_ev.wait_from_prev_hours)

    main_bottleneck_stage: Optional[str] = None
    main_bottleneck_median: Optional[float] = None
    if stage_waits:
        ranked = sorted(
            ((act, _median(waits)) for act, waits in stage_waits.items() if len(waits) >= 3),
            key=lambda x: x[1],
            reverse=True,
        )
        if ranked:
            main_bottleneck_stage, main_bottleneck_median = ranked[0]

    # Completion / arrival trend by week
    trend_buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"period": "", "started": 0, "completed": 0, "delayed": 0}
    )
    for c in cases:
        if c.start_time is not None:
            iso = c.start_time.isocalendar()
            key = f"{iso.year}-W{iso.week:02d}"
            trend_buckets[key]["period"] = key
            trend_buckets[key]["started"] += 1
            if c.status == "completed":
                trend_buckets[key]["completed"] += 1
            if c.is_delayed:
                trend_buckets[key]["delayed"] += 1

    completion_trend = [trend_buckets[k] for k in sorted(trend_buckets.keys())]

    activity_frequencies = [
        {
            "activity": act,
            "case_count": len(cids),
            "event_count": act_event_counts[act],
            "case_percentage": round((len(cids) / total_cases) * 100.0, 1) if total_cases else 0.0,
        }
        for act, cids in sorted(act_case_sets.items(), key=lambda x: len(x[1]), reverse=True)
    ]

    result = {
        "dataset_id": dataset_id,
        "total_cases": total_cases,
        "completed_cases": completed_cases,
        "open_cases": open_cases,
        "rejected_cases": rejected_cases,
        "cancelled_cases": cancelled_cases,
        "median_cycle_time_hours": median_cycle,
        "p90_cycle_time_hours": p90_cycle,
        "delayed_cases": delayed_cases,
        "delayed_rate": delayed_rate,
        "rework_cases": rework_cases,
        "rework_frequency": rework_freq,
        "main_bottleneck_stage": main_bottleneck_stage,
        "main_bottleneck_median_hours": main_bottleneck_median,
        "completion_trend": completion_trend,
        "activity_frequencies": activity_frequencies,
        "measurement_note": (
            "Single-timestamp event logs measure observed inter-event waiting time "
            "(elapsed time between consecutive logged events), not hands-on employee working time."
        ),
    }

    if persist:
        run = AnalysisRun(
            dataset_id=dataset_id,
            run_type="process_mining",
            status="completed",
            summary_json={"total_cases": total_cases, "main_bottleneck_stage": main_bottleneck_stage},
        )
        db.add(run)
        db.flush()
        for k, val, unit in [
            ("total_cases", float(total_cases), "cases"),
            ("median_cycle_time_hours", float(median_cycle), "hours"),
            ("delayed_rate", float(delayed_rate), "percent"),
            ("rework_frequency", float(rework_freq), "percent"),
        ]:
            db.add(ProcessMetric(
                dataset_id=dataset_id,
                analysis_run_id=run.id,
                metric_key=k,
                metric_value=val,
                unit=unit,
            ))
        db.commit()

    return result


def build_process_graph(
    db: Session,
    dataset_id: int,
    department: Optional[str] = None,
    process_type: Optional[str] = None,
    min_case_pct: float = 0.0,
) -> dict[str, Any]:
    """Generate a deterministic Directly-Follows Graph (DFG) with layered layout coordinates."""
    case_query = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id)
    if department and department != "All":
        case_query = case_query.filter(ProcessCase.department == department)
    if process_type and process_type != "All":
        case_query = case_query.filter(ProcessCase.process_type == process_type)

    cases = case_query.all()
    case_ids = [c.id for c in cases]
    total_cases = len(cases)

    if total_cases == 0:
        return {
            "dataset_id": dataset_id,
            "total_cases_in_filter": 0,
            "nodes": [],
            "edges": [],
            "common_path": [],
            "filters_applied": {
                "department": department,
                "process_type": process_type,
                "min_case_pct": min_case_pct,
            },
        }

    events = (
        db.query(ProcessEvent)
        .filter(ProcessEvent.dataset_id == dataset_id, ProcessEvent.case_id.in_(case_ids))
        .order_by(ProcessEvent.case_id, ProcessEvent.sequence_index)
        .all()
    )

    events_by_case: dict[int, list[ProcessEvent]] = defaultdict(list)
    for ev in events:
        events_by_case[ev.case_id].append(ev)

    node_cases: dict[str, set[int]] = defaultdict(set)
    node_events: Counter[str] = Counter()
    node_waits_out: dict[str, list[float]] = defaultdict(list)
    node_rework_counts: Counter[str] = Counter()

    edge_transitions: Counter[tuple[str, str]] = Counter()
    edge_cases: dict[tuple[str, str], set[int]] = defaultdict(set)
    edge_waits: dict[tuple[str, str], list[float]] = defaultdict(list)

    for cid, case_evs in events_by_case.items():
        seen_in_case: set[str] = set()
        for i, ev in enumerate(case_evs):
            act = ev.activity
            node_cases[act].add(cid)
            node_events[act] += 1
            if act in seen_in_case:
                node_rework_counts[act] += 1
            seen_in_case.add(act)

            if i > 0:
                prev_act = case_evs[i - 1].activity
                wait = ev.wait_from_prev_hours if ev.wait_from_prev_hours is not None else 0.0
                pair = (prev_act, act)
                edge_transitions[pair] += 1
                edge_cases[pair].add(cid)
                edge_waits[pair].append(wait)
                node_waits_out[prev_act].append(wait)

    # Filter nodes and edges by min_case_pct
    kept_nodes = {
        act for act, cids in node_cases.items()
        if (len(cids) / total_cases) * 100.0 >= min_case_pct
    }
    if not kept_nodes:
        kept_nodes = set(node_cases.keys())

    kept_edges = [
        pair for pair, cids in edge_cases.items()
        if pair[0] in kept_nodes and pair[1] in kept_nodes and (len(cids) / total_cases) * 100.0 >= min_case_pct
    ]

    # Deterministic layered layout (longest-path rank on forward DAG)
    # Identify forward edges by ordering activities by their median first-appearance index
    first_pos_sum: dict[str, list[int]] = defaultdict(list)
    for case_evs in events_by_case.values():
        seen: set[str] = set()
        for idx, ev in enumerate(case_evs):
            if ev.activity not in seen:
                first_pos_sum[ev.activity].append(idx)
                seen.add(ev.activity)

    avg_pos = {act: float(np.mean(pos)) for act, pos in first_pos_sum.items()}

    # Build DAG of forward edges (where avg_pos[u] < avg_pos[v])
    adj: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = {n: 0 for n in kept_nodes}
    for u, v in kept_edges:
        if u != v and avg_pos.get(u, 0.0) < avg_pos.get(v, 0.0):
            adj[u].append(v)
            in_degree[v] = in_degree.get(v, 0) + 1

    # Kahn's topological sort + longest path layering
    layer_map: dict[str, int] = {n: 0 for n in kept_nodes}
    queue = sorted([n for n in kept_nodes if in_degree.get(n, 0) == 0], key=lambda x: (avg_pos.get(x, 0.0), x))
    visited_order: list[str] = []
    temp_in = dict(in_degree)
    while queue:
        curr = queue.pop(0)
        visited_order.append(curr)
        for nxt in sorted(adj.get(curr, [])):
            layer_map[nxt] = max(layer_map[nxt], layer_map[curr] + 1)
            temp_in[nxt] -= 1
            if temp_in[nxt] == 0:
                queue.append(nxt)
                queue.sort(key=lambda x: (avg_pos.get(x, 0.0), x))

    # Group nodes by layer and assign deterministic x, y coordinates
    nodes_by_layer: dict[int, list[str]] = defaultdict(list)
    for n in kept_nodes:
        nodes_by_layer[layer_map[n]].append(n)

    coords: dict[str, tuple[float, float]] = {}
    x_spacing = 290.0
    y_spacing = 155.0
    for layer_idx, acts in sorted(nodes_by_layer.items()):
        # Sort deterministically: highest case count first, then alphabetical
        acts.sort(key=lambda a: (-len(node_cases[a]), a))
        total_h = (len(acts) - 1) * y_spacing
        start_y = -total_h / 2.0 + 220.0
        for row_idx, act in enumerate(acts):
            coords[act] = (round(layer_idx * x_spacing + 60.0, 1), round(start_y + row_idx * y_spacing, 1))

    # Bottleneck threshold: top 25% median wait or median >= 24h
    node_medians = {act: _median(node_waits_out[act]) for act in kept_nodes}
    non_zero_medians = sorted(m for m in node_medians.values() if m > 0)
    bottleneck_cutoff = float(np.percentile(non_zero_medians, 75)) if non_zero_medians else 24.0
    bottleneck_cutoff = max(bottleneck_cutoff, 12.0)

    nodes_out: list[dict[str, Any]] = []
    for act in sorted(kept_nodes, key=lambda a: (layer_map[a], -len(node_cases[a]), a)):
        med_wait = node_medians[act]
        p90_wait = _percentile(node_waits_out[act], 90)
        c_count = len(node_cases[act])
        freq_pct = round((c_count / total_cases) * 100.0, 1)
        rework_cnt = int(node_rework_counts[act])
        # Bottleneck score combines wait time and affected case share
        b_score = round(med_wait * (c_count / total_cases), 2)
        is_bn = med_wait >= bottleneck_cutoff and c_count >= max(3, int(total_cases * 0.1))
        x, y = coords[act]
        nodes_out.append({
            "id": act,
            "activity": act,
            "case_count": c_count,
            "event_count": int(node_events[act]),
            "frequency_pct": freq_pct,
            "median_wait_to_next_hours": med_wait,
            "p90_wait_to_next_hours": p90_wait,
            "is_bottleneck": is_bn,
            "bottleneck_score": b_score,
            "rework_count": rework_cnt,
            "x": x,
            "y": y,
            "layer": layer_map[act],
        })

    edges_out: list[dict[str, Any]] = []
    for u, v in sorted(kept_edges, key=lambda p: (-edge_transitions[p], p[0], p[1])):
        c_count = len(edge_cases[(u, v)])
        case_pct = round((c_count / total_cases) * 100.0, 1)
        med_e = _median(edge_waits[(u, v)])
        p90_e = _percentile(edge_waits[(u, v)], 90)
        is_rework = (u == v) or (layer_map.get(v, 0) <= layer_map.get(u, 0))
        is_bn = med_e >= bottleneck_cutoff and c_count >= max(3, int(total_cases * 0.1))
        edges_out.append({
            "id": f"{u}__to__{v}",
            "source": u,
            "target": v,
            "transition_count": int(edge_transitions[(u, v)]),
            "case_count": c_count,
            "case_percentage": case_pct,
            "median_elapsed_hours": med_e,
            "p90_elapsed_hours": p90_e,
            "is_rework": is_rework,
            "is_bottleneck": is_bn,
        })

    # Common path = most frequent variant among filtered cases
    variant_counts = Counter(c.variant_signature for c in cases if c.variant_signature)
    common_path: list[str] = []
    if variant_counts:
        top_sig = variant_counts.most_common(1)[0][0]
        common_path = [s.strip() for s in top_sig.split("->")]

    return {
        "dataset_id": dataset_id,
        "total_cases_in_filter": total_cases,
        "nodes": nodes_out,
        "edges": edges_out,
        "common_path": common_path,
        "filters_applied": {
            "department": department or "All",
            "process_type": process_type or "All",
            "min_case_pct": min_case_pct,
        },
    }


def compute_bottlenecks(db: Session, dataset_id: int) -> list[dict[str, Any]]:
    """Compute statistically defensible bottleneck stage rankings."""
    cases = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id).all()
    case_dept = {c.id: (c.department or "Unassigned") for c in cases}

    events = (
        db.query(ProcessEvent)
        .filter(ProcessEvent.dataset_id == dataset_id)
        .order_by(ProcessEvent.case_id, ProcessEvent.sequence_index)
        .all()
    )

    events_by_case: dict[int, list[ProcessEvent]] = defaultdict(list)
    for ev in events:
        events_by_case[ev.case_id].append(ev)

    stage_waits: dict[str, list[float]] = defaultdict(list)
    stage_cases: dict[str, set[int]] = defaultdict(set)
    stage_dept_waits: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    stage_rework_cases: dict[str, set[int]] = defaultdict(set)
    stage_rework_count: Counter[str] = Counter()

    for cid, case_evs in events_by_case.items():
        seen: set[str] = set()
        dept = case_dept.get(cid, "Unassigned")
        for i, ev in enumerate(case_evs):
            if ev.activity in seen:
                stage_rework_cases[ev.activity].add(cid)
                stage_rework_count[ev.activity] += 1
            seen.add(ev.activity)

            if i > 0 and ev.wait_from_prev_hours is not None:
                prev_act = case_evs[i - 1].activity
                stage_waits[prev_act].append(ev.wait_from_prev_hours)
                stage_cases[prev_act].add(cid)
                stage_dept_waits[prev_act][dept].append(ev.wait_from_prev_hours)

    total_cases = max(1, len(cases))
    results: list[dict[str, Any]] = []
    for act, waits in stage_waits.items():
        med = _median(waits)
        p90 = _percentile(waits, 90)
        mean_w = _mean(waits)
        affected = len(stage_cases[act])
        rw_cnt = int(stage_rework_count[act])
        rw_freq = round((len(stage_rework_cases[act]) / affected) * 100.0, 1) if affected > 0 else 0.0
        b_score = round((med * 0.6 + p90 * 0.4) * (affected / total_cases), 2)

        dept_breakdown = [
            {
                "department": d,
                "median_wait_hours": _median(d_waits),
                "p90_wait_hours": _percentile(d_waits, 90),
                "case_count": len(d_waits),
            }
            for d, d_waits in sorted(stage_dept_waits[act].items())
        ]

        results.append({
            "activity": act,
            "median_wait_hours": med,
            "p90_wait_hours": p90,
            "mean_wait_hours": mean_w,
            "affected_cases": affected,
            "rework_frequency": rw_freq,
            "rework_count": rw_cnt,
            "bottleneck_score": b_score,
            "department_breakdown": dept_breakdown,
            "measurement_type": "Observed inter-event waiting time (to next logged stage)",
        })

    results.sort(key=lambda r: r["bottleneck_score"], reverse=True)
    return results


def compute_variants(db: Session, dataset_id: int) -> list[dict[str, Any]]:
    """Group cases by observed activity sequence and compute variant statistics."""
    cases = db.query(ProcessCase).filter(ProcessCase.dataset_id == dataset_id).all()
    total_cases = len(cases)
    if total_cases == 0:
        return []

    by_variant: dict[str, list[ProcessCase]] = defaultdict(list)
    for c in cases:
        vid = c.variant_id or "V-UNKNOWN"
        by_variant[vid].append(c)

    variants: list[dict[str, Any]] = []
    for vid, v_cases in by_variant.items():
        sig = v_cases[0].variant_signature or ""
        activities = [s.strip() for s in sig.split("->") if s.strip()]
        cycles = [c.cycle_time_hours for c in v_cases if c.cycle_time_hours is not None]
        cnt = len(v_cases)
        variants.append({
            "variant_id": vid,
            "activities": activities,
            "signature": sig,
            "case_count": cnt,
            "case_percentage": round((cnt / total_cases) * 100.0, 1),
            "median_cycle_time_hours": _median(cycles),
            "p90_cycle_time_hours": _percentile(cycles, 90),
            "completed_count": sum(1 for c in v_cases if c.status == "completed"),
            "open_count": sum(1 for c in v_cases if c.status == "open"),
            "rejected_count": sum(1 for c in v_cases if c.status == "rejected"),
            "cancelled_count": sum(1 for c in v_cases if c.status == "cancelled"),
            "avg_rework_count": round(float(np.mean([c.rework_count for c in v_cases])), 2),
            "delayed_rate": round((sum(1 for c in v_cases if c.is_delayed) / cnt) * 100.0, 1),
        })

    variants.sort(key=lambda v: v["case_count"], reverse=True)
    return variants
