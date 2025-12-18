export function LayoutSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/60" />
          <div className="space-y-2">
            <div className="h-6 w-36 bg-muted/60 rounded-lg" />
            <div className="h-3 w-24 bg-muted/40 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-muted/40 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="bg-card rounded-2xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="w-8 h-8 rounded-lg bg-muted/40" />
            </div>
            <div className="h-7 w-20 bg-muted/60 rounded mb-2" />
            <div className="h-3 w-14 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Widget Cards Skeleton */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="h-5 w-32 bg-muted/60 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted/50 rounded" />
                  <div className="h-3 w-1/2 bg-muted/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="h-5 w-28 bg-muted/60 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Table/List Skeleton */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="h-5 w-36 bg-muted/60 rounded" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 bg-muted/40 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-muted/50 rounded" />
                <div className="h-3 w-28 bg-muted/30 rounded" />
              </div>
              <div className="h-8 w-20 bg-muted/40 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
