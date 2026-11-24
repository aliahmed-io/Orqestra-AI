import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, KpiTile } from "@/components/ui/primitives";
import { formatDurationHours, formatPct } from "@/lib/utils";
import { ORQESTRA_TOKENS } from "@/lib/tokens";

describe("Orqestra AI Design Tokens & Formatters", () => {
  it("exports the exact brand palette tokens", () => {
    expect(ORQESTRA_TOKENS.colors.porcelain).toBe("#F5F3EE");
    expect(ORQESTRA_TOKENS.colors.indigo).toBe("#354D8A");
    expect(ORQESTRA_TOKENS.colors.softSlate).toBe("#A9B6CE");
    expect(ORQESTRA_TOKENS.colors.apricot).toBe("#ED9D78");
    expect(ORQESTRA_TOKENS.colors.ink).toBe("#242B3A");
  });

  it("formats durations and percentages deterministically", () => {
    expect(formatDurationHours(0.5)).toBe("30m");
    expect(formatDurationHours(12.4)).toBe("12.4h");
    expect(formatDurationHours(48)).toBe("2.0d");
    expect(formatDurationHours(null)).toBe("—");
    expect(formatPct(34.56)).toBe("34.6%");
  });
});

describe("UI Primitives", () => {
  it("renders KpiTile with label, value, and sublabel", () => {
    render(
      <KpiTile
        label="Median Cycle Time"
        value="3.2d"
        sublabel="P90: 6.1d"
        accent="indigo"
      />
    );
    expect(screen.getByText("Median Cycle Time")).toBeInTheDocument();
    expect(screen.getByText("3.2d")).toBeInTheDocument();
    expect(screen.getByText("P90: 6.1d")).toBeInTheDocument();
  });

  it("renders Badge with bottleneck tone", () => {
    render(<Badge tone="apricot">Bottleneck</Badge>);
    expect(screen.getByText("Bottleneck")).toBeInTheDocument();
  });
});
