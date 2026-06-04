"use client";

import Image from "next/image";
import { Info, Play } from "lucide-react";
import { tmdbImageUrl } from "@/services/tmdb.service";
import { Button } from "@/components/ui/button";
import { ContinueWatchingRecord } from "@/lib/storage";
import { paths } from "@/lib/paths";
import { match } from "ts-pattern";
import Link from "next/link";

export type Featured =
  | {
      id: number;
      type: "movie" | "tv";
      backdrop_path: string;
      name: string;
      overview: string;
      isContinueWatching?: false;
    }
  | (ContinueWatchingRecord[number] & { isContinueWatching: true });

export default function Hero({ featured }: { featured: Featured }) {
  return (
    <div className="-mt-16 -mb-72 pb-72 pt-16 h-screen relative flex flex-col">
      <Image
        src={tmdbImageUrl("backdrop", "w1280", featured?.backdrop_path)}
        alt={
          featured
            ? "Featured: " + ("title" in featured ? featured.title : featured.name)
            : "No featured media"
        }
        width={1920}
        height={1080}
        loading="eager"
        className="absolute top-0 bottom-0 left-0 right-0 -mb-72 -mt-16 -z-10 object-cover h-screen w-screen brightness-50 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_50%,rgba(0,0,0,0)_100%)]"
      />
      <div className="my-auto px-16">
        <h1>{featured.name}</h1>
        <p className="mt-4 max-w-xl text-lg">{featured.overview}</p>
        <div className="flex gap-6 mt-10">
          <Button size="lg" className="text-xl p-6" asChild>
            <Link
              href={match(featured)
                .with({ isContinueWatching: true, type: "tv" }, (featured) =>
                  paths.player(featured.type, featured.id, {
                    episode: featured.season,
                    season: featured.episode,
                  }),
                )
                .with({ isContinueWatching: true, type: "movie" }, (featured) =>
                  paths.player(featured.type, featured.id, {}),
                )
                .otherwise(() => paths.details(featured.type, featured.id))}
            >
              <Play /> Continue Watching
            </Link>
          </Button>

          <Button size="lg" className="text-xl p-6" variant="outline" asChild>
            <Link href={paths.details(featured.type, featured.id)}>
              <Info /> More Info
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
