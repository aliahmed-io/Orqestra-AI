"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CompletionTrendChart({
  data,
}: {
  data: Array<{
    period: string;
    started: number;
    completed: number;
    delayed: number;
  }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="indigoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#354D8A" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#354D8A" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="apricotFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ED9D78" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#ED9D78" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2DDD3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "#5A657A" }}
            axisLine={{ stroke: "#E2DDD3" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#5A657A" }}
            axisLine={false}
            tickLine={false}
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
          <Area
            type="monotone"
            dataKey="started"
            name="Started Cases"
            stroke="#A9B6CE"
            strokeWidth={2}
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="completed"
            name="Completed Cases"
            stroke="#354D8A"
            strokeWidth={2}
            fill="url(#indigoFill)"
          />
          <Area
            type="monotone"
            dataKey="delayed"
            name="Delayed Cases"
            stroke="#ED9D78"
            strokeWidth={2}
            fill="url(#apricotFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
