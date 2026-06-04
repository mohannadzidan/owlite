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
export const paths = {
  player,
  details,
};
