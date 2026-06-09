import q from "./q";

function player(
  type: "tv",
  id: string | number,
  options: { season: string | number; episode: string | number; source?: string },
): string;
function player(
  type: "movie",
  id: string | number,
  options: { season?: string | number; episode?: string | number; source?: string },
): string;

function player(
  type: string,
  id: string | number,
  options: Record<string, string | number> = {},
): string {
  return `/player/${type}/${id}?${q(options)}`;
}

function details(type: "tv" | "movie", id: string | number): string {
  return `/media/${type}/${id}`;
}

function subtitles(type: "tv" | "movie", id: string | number): string {
  return `/media/${type}/${id}/subtitles`;
}

function remote(): string {
  return `/remote`;
}

function remoteControls(): string {
  return `/remote/controls`;
}

export const paths = {
  player,
  details,
  subtitles,
  remote,
  remoteControls,
};
