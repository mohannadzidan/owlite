export type RecommendationItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
};

export type BecauseYouWatchedRow = {
  seedTitle: string;
  seedType: "movie" | "tv";
  seedId: number;
  items: RecommendationItem[];
};

export type RecommendationsPayload = {
  becauseYouWatched: BecauseYouWatchedRow[];
  topPicks: RecommendationItem[];
  topCategories: Array<{ genreName: string; items: RecommendationItem[] }>;
};
