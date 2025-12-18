import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
  showTrend?: boolean;
}

export function SparklineChart({ 
  data, 
  color = "hsl(var(--primary))", 
  className = "",
  height = 32,
  showTrend = true 
}: SparklineChartProps) {
  const chartData = useMemo(() => 
    data.map((value, index) => ({ value, index })),
    [data]
  );

  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    if (first === 0) return last > 0 ? 100 : 0;
    return ((last - first) / first) * 100;
  }, [data]);

  const trendColor = trend >= 0 ? "text-success" : "text-destructive";
  const trendBg = trend >= 0 ? "bg-success/10" : "bg-destructive/10";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showTrend && data.length >= 2 && (
        <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${trendBg} ${trendColor}`}>
          {trend >= 0 ? "+" : ""}{trend.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// Generate mock sparkline data for demos
export function generateSparklineData(days: number = 7, baseValue: number = 100, variance: number = 0.3): number[] {
  const data: number[] = [];
  let currentValue = baseValue;
  
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * 2 * variance * baseValue;
    currentValue = Math.max(0, currentValue + change);
    data.push(Math.round(currentValue));
  }
  
  return data;
}
