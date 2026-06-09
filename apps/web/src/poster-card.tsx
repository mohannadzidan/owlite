
import { type ComponentProps } from "react";
import { tmdbImageUrl } from "@/services/tmdb.service";
import { cn } from "@/lib/utils";

export function PosterCard({
  posterPath,
  alt,
  className,
  ...props
}: ComponentProps<"div"> & {
  posterPath: string | null;
  alt: string;
}) {
  return (
    <div
      className={cn("group flex w-36 flex-shrink-0 flex-col gap-2 outline-none", className)}
      {...props}
    >
      <div
        className="relative w-full overflow-hidden rounded-xl "
        style={{ paddingBottom: "150%" }}
      >
        {posterPath ? (
          <img
            src={tmdbImageUrl("poster", "w342", posterPath)}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 group-focus:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-card text-muted-foreground flex items-center justify-center p-3 text-center text-xs">
            {alt}
          </div>
        )}
      </div>
    </div>
  );
}
