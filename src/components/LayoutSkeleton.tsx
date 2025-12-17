export function LayoutSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-primary/10 rounded-lg" />
          <div className="h-4 w-28 bg-muted/40 rounded" />
        </div>
        <div className="h-9 w-9 bg-primary/10 rounded-full" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="h-20 md:h-24 bg-card/50 rounded-xl border border-primary/10 overflow-hidden"
          >
            <div className="p-3 md:p-4 space-y-2 md:space-y-3">
              <div className="h-3 md:h-4 w-14 md:w-16 bg-muted/40 rounded" />
              <div className="h-5 md:h-6 w-20 md:w-24 bg-primary/10 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Widget Cards Skeleton */}
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <div className="h-48 md:h-64 bg-card/50 rounded-xl border border-primary/10">
          <div className="p-4 space-y-4">
            <div className="h-5 w-32 bg-muted/40 rounded" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="h-48 md:h-64 bg-card/50 rounded-xl border border-primary/10">
          <div className="p-4 space-y-4">
            <div className="h-5 w-28 bg-muted/40 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table/List Skeleton */}
      <div className="bg-card/50 rounded-xl border border-primary/10 p-4">
        <div className="h-5 w-36 bg-muted/40 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted/30 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted/20 rounded" />
                <div className="h-3 w-1/2 bg-muted/15 rounded" />
              </div>
              <div className="h-8 w-20 bg-primary/10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
