"use client";
import SelectSourceDialog from "./select-source-dialog";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { sources } from "@/services/api.service";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ErrorFallback from "@/components/error";
import { errorThrower } from "@/services/request";

export default function Page() {
  const searchPrams = useSearchParams();
  const { type, id } = useParams<{ type: "tv" | "movie"; id: string }>();
  const season = searchPrams.get("season") ?? undefined;
  const episode = searchPrams.get("episode") ?? undefined;
  const sourceId = searchPrams.get("source") ?? undefined;
  const isTitleParametersOk = (type === "tv" && season && episode) || type === "movie";
  const playResponse = useSWR(
    sourceId && isTitleParametersOk ? [sourceId, type, id, season, episode] : null,
    () =>
      errorThrower(
        sources.play({
          source_id: sourceId!,
          tmdb_id: parseInt(id),
          media_type: type!,
          screenSize: Math.min(window.screen.width, window.screen.height),
          episode: episode ? parseInt(episode) : undefined,
          season: season ? parseInt(season) : undefined,
        }),
      ),
  );
  if (!isTitleParametersOk) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <ErrorFallback
          title="Something went wrong"
          message="Unexpected error occurred, please try again later."
        >
          <Button>
            <Link href="/">Go back</Link>
          </Button>
        </ErrorFallback>
      </div>
    );
  }
  if (!sourceId)
    return <SelectSourceDialog type={type} season={season} episode={episode} id={id} />;

  if (type === "tv" && (!season || !episode)) {
    return <div>Missing season or episode</div>;
  }
  if (!playResponse.isLoading && playResponse.data) {
  }

  return <> yeah</>;
}
