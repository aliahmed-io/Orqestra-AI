"use client";

import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CalibrationChart({
  bins,
}: {
  bins: Array<{ predicted: number; observed: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={bins} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
          <CartesianGrid stroke="#E2DDD3" strokeDasharray="3 3" />
          <XAxis
            dataKey="predicted"
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: "#5A657A" }}
            label={{
              value: "Predicted Probability",
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "#5A657A",
            }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: "#5A657A" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E2DDD3",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="#A9B6CE"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="observed"
            name="Observed Delay Rate"
            stroke="#354D8A"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#354D8A" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
