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
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
        <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-2">{title}</CardTitle>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">{value}</div>
        {trend && (
          <p className={`text-[10px] sm:text-xs mt-1 sm:mt-2 flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-success' : 'text-destructive'
          }`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
