"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BottleneckStage } from "@/lib/api";

export function BottleneckChart({ stages }: { stages: BottleneckStage[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stages}
          margin={{ top: 10, right: 16, left: -8, bottom: 16 }}
        >
          <CartesianGrid stroke="#E2DDD3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="activity"
            tick={{ fontSize: 11, fill: "#242B3A" }}
            axisLine={{ stroke: "#E2DDD3" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#5A657A" }}
            axisLine={false}
            tickLine={false}
            unit="h"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E2DDD3",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar
            dataKey="median_wait_hours"
            name="Median Wait (h)"
            fill="#354D8A"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="p90_wait_hours"
            name="P90 Wait (h)"
            fill="#ED9D78"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
