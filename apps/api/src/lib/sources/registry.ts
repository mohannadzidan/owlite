import type { VideoSource } from "@owlite/types";
import streamImdbSource from "./streamimdb.source";

const sources: VideoSource[] = [streamImdbSource].sort((a, b) => a.priority - b.priority);

export function getSources(): VideoSource[] {
  return sources;
}

export function getSourceById(id: string): VideoSource | undefined {
  return sources.find((s) => s.id === id);
}
