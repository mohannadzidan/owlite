import fs from "fs";
import path from "path";
import type { LocalMapping, PlayResponse, ResolveParams, VideoSource } from "@/lib/types";

function getMappings(): LocalMapping[] {
  const mappingsPath = path.join(process.cwd(), "data", "local_mappings.json");
  try {
    const raw = fs.readFileSync(mappingsPath, "utf-8");
    return JSON.parse(raw) as LocalMapping[];
  } catch {
    return [];
  }
}

function formatEpisodePath(pattern: string, season: number, episode: number): string {
  return pattern
    .replace("{season:02d}", String(season).padStart(2, "0"))
    .replace("{episode:02d}", String(episode).padStart(2, "0"))
    .replace("{season}", String(season))
    .replace("{episode}", String(episode));
}

const localSource: VideoSource = {
  id: "local",
  name: "Local Files",
  priority: 1,
  async resolve(params: ResolveParams): Promise<PlayResponse | null> {
    const mappings = getMappings();
    const mapping = mappings.find(
      (m) => m.tmdb_id === params.tmdb_id && m.media_type === params.media_type,
    );
    if (!mapping) return null;

    let filePath: string;

    if (params.media_type === "movie") {
      filePath = mapping.local_path;
    } else {
      if (params.season == null || params.episode == null) return null;
      const pattern = mapping.episode_pattern ?? "S{season:02d}E{episode:02d}";
      const episodeId = formatEpisodePath(pattern, params.season, params.episode);

      const dir = mapping.local_path;
      if (!fs.existsSync(dir)) return null;

      const files = fs.readdirSync(dir, { recursive: true, encoding: "utf-8" }) as string[];
      const match = files.find((f) => f.includes(episodeId));
      if (!match) return null;
      filePath = path.join(dir, match);
    }

    const streamUrl = `/api/stream?path=${encodeURIComponent(filePath)}`;
    return {
      type: "direct_video",
      url: streamUrl,
      metadata: { title: mapping.title },
    };
  },
};

export default localSource;
