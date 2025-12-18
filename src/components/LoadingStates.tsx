import { cn } from "@/lib/utils";

interface LoadingCardProps {
  className?: string;
  rows?: number;
}

export function LoadingCard({ className, rows = 3 }: LoadingCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-6 animate-pulse", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-3 bg-muted rounded" style={{ width: `${100 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

interface LoadingTableProps {
  className?: string;
  rows?: number;
  cols?: number;
}

export function LoadingTable({ className, rows = 5, cols = 4 }: LoadingTableProps) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl overflow-hidden animate-pulse", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-muted/30 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-muted rounded flex-1" 
              style={{ width: colIndex === 0 ? '120px' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface LoadingMetricsProps {
  count?: number;
}

export function LoadingMetrics({ count = 4 }: LoadingMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="w-8 h-8 rounded-lg bg-muted" />
          </div>
          <div className="h-8 w-24 bg-muted rounded mb-2" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
