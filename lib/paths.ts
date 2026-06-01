import q from "./q";

function player(
  type: "tv",
  id: string,
  options: { season: string; episode: string; source?: string },
): string;
function player(
  type: "movie",
  id: string,
  options: { season?: string; episode?: string; source?: string },
): string;
function player(type: string, id: string, options: Record<string, string | number> = {}): string {
  return `/player/v2/${type}/${id}?${q(options)}`;
}

export const paths = {
  player,
};
