import { Info, Play } from "lucide-react";
import { tmdbImageUrl } from "@/services/tmdb.service";
import { Button } from "@/components/ui/button";
import type { ContinueWatchingEntry } from "@/lib/profile-types";
import { Link } from "@tanstack/react-router";

export type Featured =
  | {
      id: number;
      type: "movie" | "tv";
      backdrop_path: string;
      name: string;
      overview: string;
      isContinueWatching?: false;
    }
  | (ContinueWatchingEntry & { isContinueWatching: true });

export default function Hero({ featured }: { featured: Featured }) {
  return (
    <div className="-mt-16 -mb-72 pb-72 pt-16 h-screen relative flex flex-col">
      <img
        src={tmdbImageUrl("backdrop", "w1280", featured?.backdrop_path)}
        alt={
          featured
            ? "Featured: " + ("title" in featured ? featured.title : featured.name)
            : "No featured media"
        }
        loading="eager"
        style={{
          maskComposite: "intersect",
        }}
        className=" absolute top-0 bottom-0 left-0 right-0 -mb-72 -mt-16 -z-10 object-cover h-screen w-screen brightness-50 [mask-image:_linear-gradient(to_bottom,rgba(0,0,0,1)_50%,rgba(0,0,0,0)_100%)]"
      />
      <div className="my-auto px-16">
        <h1>{featured.name}</h1>
        <p className="mt-4 max-w-xl text-lg">{featured.overview}</p>
        <div className="flex gap-6 mt-10">
          <Button size="lg" className="text-xl p-6" asChild>
            <Link
              // to={match(featured)
              //   .with({ isContinueWatching: true, type: "tv" }, (featured) =>
              //     paths.player(featured.type, featured.id, {
              //       episode: featured.season,
              //       season: featured.episode,
              //     }),
              //   )
              //   .with({ isContinueWatching: true, type: "movie" }, (featured) =>
              //     paths.player(featured.type, featured.id, {}),
              //   )
              //   .otherwise(() => paths.details(featured.type, featured.id))}
              to={
                featured.isContinueWatching
                  ? "/player/$type/$id"
                  : featured.type === "tv"
                    ? "/media/tv/$id"
                    : "/media/movie/$id"
              }
              params={{ id: featured.id.toString(), type: featured.type }}
              search={
                featured.isContinueWatching && featured.type === "tv"
                  ? {
                      season: (featured.season ?? 1).toString(),
                      episode: (featured.episode ?? 1).toString(),
                      source: undefined,
                    }
                  : undefined
              }
            >
              <Play /> {featured.isContinueWatching ? "Continue Watching" : "Watch Now"}
            </Link>
          </Button>

          <Button size="lg" className="text-xl p-6" variant="outline" asChild>
            <Link
              to={featured.type === "tv" ? "/media/tv/$id" : "/media/movie/$id"}
              params={{ id: featured.id.toString() }}
            >
              <Info /> More Info
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
