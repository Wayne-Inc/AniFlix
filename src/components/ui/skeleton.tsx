import React from "react";

/* ------------------------------------------------------------------ */
/*  Base skeleton building block                                      */
/* ------------------------------------------------------------------ */

export type SkeletonVariant = "shimmer" | "pulse" | "static";

export type SkeletonRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  radius?: SkeletonRadius;
  animate?: boolean;
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
}

const radiusClasses: Record<SkeletonRadius, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

/**
 * Base skeleton primitive. Renders a single placeholder box.
 *
 * - `variant="shimmer"` (default): gradient shimmer across a surface base.
 * - `variant="pulse"`: subtle opacity pulse.
 * - `variant="static"`: solid surface, no animation.
 *
 * All dimensions map to inline-friendly Tailwind-ish values so callers can
 * match real component sizes without arbitrary magic numbers.
 */
export function Skeleton({
  className,
  variant = "shimmer",
  radius = "md",
  animate = true,
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  ...props
}: SkeletonProps) {
  const base = [
    "flex-shrink-0",
    radiusClasses[radius],
    width && `w-[${width}]`,
    height && `h-[${height}]`,
    minWidth && `min-w-[${minWidth}]`,
    minHeight && `min-h-[${minHeight}]`,
    maxWidth && `max-w-[${maxWidth}]`,
    maxHeight && `max-h-[${maxHeight}]`,
  ].filter(Boolean).join(" ");

  let background: string;
  if (variant === "static") {
    background = "bg-zinc-800";
  } else if (variant === "pulse") {
    background = "bg-zinc-800 animate-skeleton-pulse";
  } else {
    // shimmer — default, subtle gradient over surface
    background =
      "bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] animate-skeleton-shimmer";
  }

  if (!animate) {
    background = background.replace(" animate-skeleton-shimmer", "").replace(" animate-skeleton-pulse", "");
  }

  return (
    <div className={`${base} ${background} ${className || ""}`} {...props} />
  );
}

/* ------------------------------------------------------------------ */
/*  Convenience primitives                                            */
/* ------------------------------------------------------------------ */

/** Single line of text, e.g. a title, label, or meta line. */
export function SkeletonText({
  className,
  width = "w-full",
  height = "h-4",
  radius = "md",
  ...props
}: { className?: string; width?: string; height?: string; radius?: SkeletonRadius } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={`${width} ${height} ${className || ""}`}
      radius={radius}
      {...props}
    />
  );
}

/** Avatar / profile picture placeholder (circle). */
export function SkeletonAvatar({
  className,
  size = "size-24",
  ...props
}: { className?: string; size?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={`${size} ${className || ""}`} radius="full" {...props} />
  );
}

/** Image placeholder with an explicit aspect ratio. */
export function SkeletonImage({
  className,
  aspect = "aspect-[2/3]",
  width = "w-full",
  ...props
}: { className?: string; aspect?: string; width?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={`${aspect} ${width} ${className || ""}`} radius="xl" {...props} />
  );
}

/** Button placeholder. */
export function SkeletonButton({
  className,
  size = "h-10 w-28",
  ...props
}: { className?: string; size?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={`${size} ${className || ""}`} radius="md" {...props} />
  );
}

/* ------------------------------------------------------------------ */
/*  Composite primitives                                              */
/* ------------------------------------------------------------------ */

/** A card-shaped placeholder (surface card with optional image + text). */
export function SkeletonCard({
  className,
  image = true,
  imageAspect = "aspect-[2/3]",
  title = true,
  meta = true,
  titleWidth = "w-full",
  metaWidth = "w-3/4",
  ...props
}: {
  className?: string;
  image?: boolean;
  imageAspect?: string;
  title?: boolean;
  meta?: boolean;
  titleWidth?: string;
  metaWidth?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={`overflow-hidden ${className || ""}`} radius="xl" {...props}>
      {image && <SkeletonImage aspect={imageAspect} className="size-full" />}
      <div className="p-3">
        {title && <SkeletonText width={titleWidth} className="mt-3" />}
        {meta && <SkeletonText width={metaWidth} height="h-3" className="mt-1" />}
      </div>
    </Skeleton>
  );
}

/** A vertical list of repeated text lines. */
export function SkeletonList({
  className,
  count = 3,
  itemHeight = "h-4",
  itemWidth = "w-full",
  gap = "space-y-2",
  ...props
}: {
  className?: string;
  count?: number;
  itemHeight?: string;
  itemWidth?: string;
  gap?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${gap} ${className || ""}`} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonText key={i} width={itemWidth} height={itemHeight} />
      ))}
    </div>
  );
}

/** A grid of repeated cells (portrait cards by default). */
export function SkeletonGrid({
  className,
  count = 6,
  cols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  gap = "gap-4 sm:gap-6",
  cellAspect = "aspect-[2/3]",
  ...props
}: {
  className?: string;
  count?: number;
  cols?: string;
  gap?: string;
  cellAspect?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${cols} ${gap} ${className || ""}`} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonImage key={i} aspect={cellAspect} className="size-full" />
      ))}
    </div>
  );
}

/** Header placeholder: avatar + title line. */
export function SkeletonHeader({
  className,
  avatar = true,
  title = true,
  ...props
}: { className?: string; avatar?: boolean; title?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={`flex items-center gap-3 ${className || ""}`} {...props}>
      {avatar && <SkeletonAvatar className="shrink-0" size="size-10" />}
      {title && <SkeletonText width="w-40" />}
    </Skeleton>
  );
}

/* ------------------------------------------------------------------ */
/*  AnimeCard placeholder – matches AnimeCard exactly                 */
/*  Portrait (default) & landscape variants, responsive breakpoints   */
/* ------------------------------------------------------------------ */

export function AnimeCardSkeleton({
  landscape = false,
  fluid = false,
  compact = false,
  rank = false,
  progress = false,
}: {
  landscape?: boolean;
  fluid?: boolean;
  compact?: boolean;
  rank?: boolean;
  progress?: boolean;
} = {}) {
  const width = fluid
    ? "w-full"
    : landscape
      ? compact
        ? "w-[230px] sm:w-[300px] shrink-0"
        : "w-[280px] sm:w-[380px] shrink-0"
      : compact
        ? "w-[155px] sm:w-[195px] shrink-0"
        : "w-[175px] sm:w-[220px] shrink-0";

  return (
    <div className={`group relative block shrink-0 ${width} data-context=anime`}>
      {/* Image area */}
      <div
        className={[
          "relative overflow-hidden rounded-xl bg-zinc-900 shadow-md transition-shadow duration-300 group-hover:shadow-2xl",
          landscape ? "aspect-video" : "aspect-[2/3]",
        ].join(" ")}
      >
        <Skeleton className="size-full" />
        <div className="grid size-full place-items-center bg-zinc-900/80 p-2 text-center text-xs text-zinc-500" />
        <div
          className={[
            "absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#111115]/95 via-[#111115]/40 to-transparent pointer-events-none transition-opacity duration-300",
            compact || landscape ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ].join(" ")}
        />
        {/* Rating badge */}
        <div
          className={[
            "absolute top-2 z-10 flex items-center gap-1 rounded bg-black/70 backdrop-blur-lg px-2 py-1 border border-red-500/30",
            rank ? "left-10" : "left-2",
          ].join(" ")}
        >
          <Skeleton className="size-3.5 fill-current text-red-500" />
          <Skeleton className="text-red-500 font-bold text-[11px] sm:text-xs h-4 w-12 rounded" />
        </div>
        {/* Watchlist button */}
        <button type="button" className="absolute top-2 right-2 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-label="Add to My List">
          <div className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm">
            <Skeleton className="size-4 fill-current" />
          </div>
        </button>
        {/* Bottom title / meta area */}
        <div
          className={[
            "absolute inset-x-0 bottom-0 p-3 transition-all duration-300 ease-out",
            landscape ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
          ].join(" ")}
        >
          <Skeleton
            className={[
              "font-bold text-white line-clamp-1 drop-shadow-lg select-none",
              landscape
                ? compact
                  ? "text-sm sm:text-base"
                  : "text-lg sm:text-xl"
                : compact
                  ? "text-xs sm:text-sm"
                  : "text-xs sm:text-sm",
            ].join(" ")}
          />
          <div className="flex items-center gap-1.5 mt-0.5">
            <Skeleton
              className={[
                "text-zinc-400",
                landscape
                  ? compact
                    ? "text-xs sm:text-sm"
                    : "text-base sm:text-lg"
                  : compact
                    ? "text-xs sm:text-sm"
                    : "text-[10px] sm:text-xs",
              ].join(" ")}
            />
            <Skeleton className="text-zinc-500/40 h-3 w-1 rounded" />
            <Skeleton
              className={[
                "text-white/80",
                landscape
                  ? compact
                    ? "text-xs sm:text-sm"
                    : "text-base sm:text-lg"
                  : compact
                    ? "text-xs sm:text-sm"
                    : "text-[10px] sm:text-xs",
              ].join(" ")}
            />
          </div>
          <div className="mt-1 flex items-center gap-1 text-purple-300">
            <Skeleton className={landscape ? "size-4 shrink-0" : "size-3 shrink-0"} />
            <Skeleton
              className={[
                "line-clamp-1",
                landscape
                  ? compact
                    ? "text-xs sm:text-sm"
                    : "text-base sm:text-lg"
                  : compact
                    ? "text-xs sm:text-sm"
                    : "text-[10px] sm:text-[11px]",
              ].join(" ")}
            />
          </div>
        </div>
        {rank && (
          <div aria-hidden="true" className="absolute left-0 top-0 z-[5] flex flex-col items-center justify-center overflow-hidden font-bold text-white" style={{ width: 30, height: 38, padding: "5px 2px 7px", clipPath: "polygon(0px 0px, 100% 0px, 100% 100%, 50% 85%, 0px 100%)", background: "#e50914", boxShadow: "0 4px 10px rgb(0 0 0 / 0.45)" }}>
            <Skeleton className="text-[9px] leading-tight uppercase tracking-wide h-3 w-6 rounded" />
            <Skeleton className="text-[11px] leading-none -mt-0.5 tabular-nums h-4 w-6 rounded" />
          </div>
        )}
        {progress && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <Skeleton className="h-full bg-red-600 w-1/2" />
            </div>
            <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row placeholder – section title + scroll buttons + card scroll    */
/* ------------------------------------------------------------------ */

export function RowSkeleton({
  title = true,
  trending = false,
}: { title?: boolean; trending?: boolean } = {}) {
  return (
    <section className="relative space-y-0 py-0 sm:space-y-0 sm:py-0">
      {title && (
        <h2 className="px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold tracking-tight">
          <Skeleton className="h-8 sm:h-9 w-52 rounded" />
        </h2>
      )}
      <div className="relative">
        <button type="button" aria-label="Scroll back" className="absolute left-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-r" style={{ display: "none" }}>
          <Skeleton className="size-5" />
        </button>
        <button type="button" aria-label="Scroll forward" className="absolute right-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-l" style={{ display: "none" }}>
          <Skeleton className="size-5" />
        </button>
        <div className="scrollbar-hide flex min-w-0 gap-3 sm:gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 sm:px-6 lg:px-8 py-3">
          {trending
            ? Array.from({ length: 3 }).map((_, i) => (
                <AnimeCardSkeleton key={`landscape-${i}`} landscape compact />
              ))
            : Array.from({ length: 7 }).map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Continue watching placeholder                                     */
/* ------------------------------------------------------------------ */

export function ContinueWatchingSkeleton({ count = 5 }: { count?: number } = {}) {
  return (
    <section className="relative space-y-0 py-0 sm:space-y-0 sm:py-0">
      <Skeleton className="px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6 h-8 sm:h-9 w-52 rounded" />
      <div className="relative">
        <div className="scrollbar-hide flex min-w-0 gap-3 sm:gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 sm:px-6 lg:px-8 py-3">
          {Array.from({ length: count }).map((_, i) => (
            <AnimeCardSkeleton key={i} progress />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Banner placeholder                                           */
/* ------------------------------------------------------------------ */

export function HeroBannerSkeleton() {
  return (
    <div className="relative w-full h-[75vh] min-h-[520px] max-h-[820px] overflow-hidden select-none">
      {/* Background Media Backdrop */}
      <div className="absolute inset-0">
        <SkeletonImage className="w-full h-full object-cover object-center transform scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111115] via-[#111115]/75 to-transparent w-full md:w-3/4" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111115] via-[#111115]/30 to-transparent" />
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#0a0a0d]/80 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 z-20">
        <div className="max-w-2xl space-y-4">
          {/* Category Tag & Kanji Subtitle */}
          <div className="flex items-center gap-3 text-xs font-semibold tracking-wider">
            <Skeleton className="h-4 w-24 rounded text-red-400" />
            <span className="text-zinc-400">·</span>
            <Skeleton className="h-4 w-28 rounded text-zinc-300" />
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            <SkeletonText width="w-3/4" height="h-10 sm:h-12 lg:h-14" />
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-300 font-medium">
            <Skeleton className="h-4 w-20 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-400" />
            <span>·</span>
            <Skeleton className="h-4 w-16 rounded-full border border-zinc-600 px-1.5 py-0.5" />
            <span>·</span>
            <Skeleton className="h-4 w-24 rounded-full border border-zinc-600 px-1.5 py-0.5" />
          </div>

          {/* Synopsis */}
          <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 leading-relaxed max-w-xl">
            <SkeletonText width="w-full" height="h-4" className="mt-1" />
            <SkeletonText width="w-3/4" height="h-4" className="mt-1" />
            <SkeletonText width="w-1/2" height="h-4" className="mt-1" />
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <SkeletonButton className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-zinc-950 font-bold text-sm" size="h-12 w-40" />
            <SkeletonButton className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800/80 text-white font-semibold text-sm border border-zinc-600/50" size="h-12 w-32" />
            <SkeletonButton className="p-2.5 rounded-lg border bg-zinc-900/60" size="h-10 w-10" />
          </div>
        </div>

        {/* Bottom Bar: Sound Toggle & Featured Anime Carousel Switcher */}
        <div className="absolute right-4 sm:right-8 bottom-12 flex items-center gap-4">
          <SkeletonButton className="p-2.5 rounded-full bg-zinc-900/70 border border-zinc-700/60" size="h-10 w-10" />
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="w-12 h-7 rounded overflow-hidden" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full Page Skeletons                                              */
/* ------------------------------------------------------------------ */

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased selection:bg-red-600 selection:text-white">
      <main className="pt-18 pb-20">
        <HeroBannerSkeleton />
        <div className="relative -mt-16 sm:-mt-24 z-20 space-y-4">
          <RowSkeleton title={true} trending={false} />
          <RowSkeleton title={true} trending={false} />
        </div>
      </main>
    </div>
  );
}

export function AnimePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="pt-18 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
          <div>
            <Skeleton className="h-8 sm:h-10 w-48 rounded mb-2" />
            <Skeleton className="h-4 w-64 text-zinc-400" />
          </div>
          <SkeletonButton className="h-8 w-32" />
        </div>
        <SkeletonGrid count={10} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" gap="gap-4 sm:gap-6" />
      </main>
    </div>
  );
}

export function MoviePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="pt-18 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
          <div>
            <Skeleton className="h-8 sm:h-10 w-56 rounded mb-2" />
            <Skeleton className="h-4 w-72 text-zinc-400" />
          </div>
          <SkeletonButton className="h-8 w-32" />
        </div>
        <SkeletonGrid count={10} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" gap="gap-4 sm:gap-6" cellAspect="aspect-[2/3]" />
      </main>
    </div>
  );
}

export function TrendingPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="w-6 h-6 rounded text-cyan-500" />
            <Skeleton className="h-8 sm:h-10 w-60 rounded" />
          </div>
          <Skeleton className="h-4 w-64 text-zinc-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="relative">
              <div className="absolute -top-3 -left-2 z-20 w-8 h-8 rounded-full bg-red-600/20" />
              <AnimeCardSkeleton />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Skeleton className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded text-zinc-500" />
            <Skeleton className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 h-10" />
          </div>
        </div>
        <SkeletonGrid count={10} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" gap="gap-4 sm:gap-6" />
      </main>
    </div>
  );
}

export function MyListPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="pt-18 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-800">
          <div>
            <Skeleton className="h-8 sm:h-10 w-40 rounded mb-2" />
            <Skeleton className="h-4 w-56 text-zinc-400" />
          </div>
        </div>
        <SkeletonGrid count={8} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" gap="gap-4 sm:gap-6" />
      </main>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 sm:h-10 w-40 rounded mb-8" />
        <div className="grid gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <SkeletonAvatar size="size-16" />
              <div className="flex-1">
                <SkeletonText width="w-40" height="h-6" />
                <SkeletonText width="w-24" height="h-3" className="mt-1 text-zinc-500" />
              </div>
              <SkeletonButton size="h-8 w-24" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#111115] text-[#e5e5e5] font-sans antialiased">
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="max-w-3xl">
          <Skeleton className="h-8 sm:h-10 w-48 rounded mb-2" />
          <Skeleton className="h-4 w-80 text-zinc-400 mt-2" />
        </header>
        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-12">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            {/* Profile Section */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <Skeleton className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-3 w-40 rounded text-zinc-500 mt-1" />
                </div>
              </div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <SkeletonAvatar size="size-24 lg:size-28" />
                  <div className="flex flex-wrap justify-center gap-2">
                    <SkeletonButton size="h-10 w-24" />
                    <SkeletonButton size="h-10 w-20" />
                  </div>
                </div>
                <div className="grid flex-1 gap-5 sm:grid-cols-2">
                  <div><SkeletonText width="w-12" height="h-3" className="text-zinc-500" /><Skeleton className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900/60 mt-1.5 flex items-center gap-2 px-3 py-2.5" /></div>
                  <div><SkeletonText width="w-20" height="h-3" className="text-zinc-500" /><div className="mt-1.5 flex gap-2"><Skeleton className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 h-10" /><SkeletonButton size="h-10 w-20" /></div></div>
                </div>
              </div>
            </section>

            {/* Connected Accounts */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <Skeleton className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-3 w-56 rounded text-zinc-500 mt-1" />
                </div>
              </div>
              <div className="space-y-3">
                {["AniList", "MyAnimeList"].map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded" />
                      <SkeletonText width="w-24" height="h-5" />
                    </div>
                    <SkeletonButton size="h-8 w-20" />
                  </div>
                ))}
              </div>
            </section>

            {/* Accessibility */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <Skeleton className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-3 w-40 rounded text-zinc-500 mt-1" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3">
                <div>
                  <SkeletonText width="w-28" height="h-5" />
                  <SkeletonText width="w-48" height="h-3" className="mt-0.5 text-zinc-500" />
                </div>
                <Skeleton className="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent bg-zinc-800" />
              </div>
            </section>
          </div>

          {/* Side column */}
          <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
            {/* Password */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <Skeleton className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-3 w-56 rounded text-zinc-500 mt-1" />
                </div>
              </div>
              <SkeletonButton className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5" size="h-10" />
            </section>

            {/* Devices */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <Skeleton className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-3 w-48 rounded text-zinc-500 mt-1" />
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                    <Skeleton className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-800" />
                    <div className="min-w-0 flex-1">
                      <SkeletonText width="w-32" height="h-4" />
                      <SkeletonText width="w-40" height="h-3" className="mt-0.5 text-zinc-500" />
                    </div>
                    <SkeletonButton size="h-8 w-20" />
                  </div>
                ))}
                <SkeletonButton className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 py-2" size="h-10" />
              </div>
            </section>

            {/* Sign Out */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <Skeleton className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-800/80 text-zinc-300" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-3 w-32 rounded text-zinc-500 mt-1" />
                </div>
              </div>
              <SkeletonButton className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 py-2.5" size="h-10" />
            </section>

            {/* Delete Account */}
            <section className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 sm:p-6">
              <Skeleton className="h-5 w-16 rounded text-red-300 mb-1" />
              <Skeleton className="h-3 w-60 rounded text-zinc-500" />
              <SkeletonButton className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-900/60 px-3 py-2 text-red-400" size="h-8" />
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}