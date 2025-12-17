import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type AspectRatio = 'square' | '16/9' | '4/3' | '3/2' | 'auto';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  aspectRatio?: AspectRatio;
  containerClassName?: string;
}

const aspectRatioClasses: Record<AspectRatio, string> = {
  'square': 'aspect-square',
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  'auto': '',
};

const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ 
    src, 
    alt = '', 
    width, 
    height,
    aspectRatio = 'auto',
    fallback,
    className,
    containerClassName,
    onError,
    ...props 
  }, ref) => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);

    const handleLoad = React.useCallback(() => {
      setIsLoading(false);
    }, []);

    const handleError = React.useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setIsLoading(false);
      setHasError(true);
      onError?.(e);
    }, [onError]);

    // Reset states when src changes
    React.useEffect(() => {
      setIsLoading(true);
      setHasError(false);
    }, [src]);

    const containerStyle: React.CSSProperties = {
      width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
      height: height ? (typeof height === 'number' ? `${height}px` : height) : 'auto',
    };

    return (
      <div 
        className={cn(
          "relative overflow-hidden bg-muted",
          aspectRatioClasses[aspectRatio],
          containerClassName
        )}
        style={containerStyle}
      >
        {/* Loading skeleton */}
        {isLoading && !hasError && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        
        {/* Error fallback */}
        {hasError && (
          fallback || (
            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
              <svg
                className="h-8 w-8 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )
        )}
        
        {/* Actual image */}
        {!hasError && (
          <img
            ref={ref}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100",
              className
            )}
            {...props}
          />
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

export { OptimizedImage };
export type { OptimizedImageProps };
