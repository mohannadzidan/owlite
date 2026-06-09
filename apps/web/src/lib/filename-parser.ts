import { filenameParse, type ParsedShow } from "@ctrl/video-filename-parser";

export function parseSubtitleFilename(filename: string) {
  return filenameParse(filename);
}

export function parseSubtitleFilenameAsTv(filename: string) {
  return filenameParse(filename, true) as ParsedShow;
}
