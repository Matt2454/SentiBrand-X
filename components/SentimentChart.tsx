"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type SentimentChartProps = {
  positive: number;
  neutral: number;
  negative: number;
};

const COLORS = {
  Positive: "#10b981",
  Neutral: "#64748b",
  Negative: "#f43f5e",
};

export function SentimentChart({
  positive,
  neutral,
  negative,
}: SentimentChartProps) {
  const data = [
    { name: "Positive", value: positive, fill: COLORS.Positive },
    { name: "Neutral", value: neutral, fill: COLORS.Neutral },
    { name: "Negative", value: negative, fill: COLORS.Negative },
  ];

  const total = positive + neutral + negative;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-zinc-900">
        Sentiment Distribution
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        Positive, neutral, and negative mentions.
      </p>

      <div className="mt-4 h-60 w-full">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-500">
            No sentiment data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                strokeWidth={0}
              />
              <Tooltip formatter={(value) => [`${value}`, "Mentions"]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {data.map((item) => (
          <li key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-700">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              {item.name}
            </div>
            <span className="font-medium text-zinc-900">{item.value}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
