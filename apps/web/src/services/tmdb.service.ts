import { TMDB } from "tmdb-ts";

const config = {
  change_keys: [
    "adult",
    "air_date",
    "also_known_as",
    "alternative_titles",
    "biography",
    "birthday",
    "budget",
    "cast",
    "certifications",
    "character_names",
    "created_by",
    "crew",
    "deathday",
    "episode",
    "episode_number",
    "episode_run_time",
    "freebase_id",
    "freebase_mid",
    "general",
    "genres",
    "guest_stars",
    "homepage",
    "images",
    "imdb_id",
    "languages",
    "name",
    "network",
    "origin_country",
    "original_name",
    "original_title",
    "overview",
    "parts",
    "place_of_birth",
    "plot_keywords",
    "production_code",
    "production_companies",
    "production_countries",
    "releases",
    "revenue",
    "runtime",
    "season",
    "season_number",
    "season_regular",
    "softcore",
    "spoken_languages",
    "status",
    "tagline",
    "title",
    "translations",
    "tvdb_id",
    "tvrage_id",
    "type",
    "video",
    "videos",
  ],
  images: {
    base_url: "http://image.tmdb.org/t/p/",
    secure_base_url: "https://image.tmdb.org/t/p/",
    backdrop_sizes: ["w300", "w780", "w1280", "original"],
    logo_sizes: ["w45", "w92", "w154", "w185", "w300", "w500", "original"],
    poster_sizes: ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
    profile_sizes: ["w45", "w185", "h632", "original"],
    still_sizes: ["w92", "w185", "w300", "original"],
  },
} as const;

export const tmdb = new TMDB("", {
  fetch: (input, init) => {
    const oldRequest =
      typeof input === "string" || input instanceof URL
        ? new Request(input, init)
        : input instanceof Request
          ? input
          : null;
    if (!oldRequest) throw new Error("Invalid input to fetch");
    const url = new URL(oldRequest.url);

    return fetch(
      import.meta.env.VITE_API_URL + "/api/v1/tmdb" + url.pathname + url.search,
      oldRequest,
    );
  },
});

export const tmdbImageUrl = <T extends "backdrop" | "logo" | "poster" | "profile" | "still">(
  type: T,
  size: (typeof config.images)[`${T}_sizes`][number],
  path: string,
) =>
  `${config.images.secure_base_url}${config.images[`${type}_sizes`].find((a) => a === size) || config.images[`${type}_sizes`][0]}${path}`;
