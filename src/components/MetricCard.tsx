import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: { value: number; direction: 'up' | 'down' };
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={`hover-lift ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={`text-xs mt-2 flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-success' : 'text-destructive'
          }`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}% vs. último período
          </p>
        )}
      </CardContent>
    </Card>
  );
}
