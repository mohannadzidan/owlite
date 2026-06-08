import { apiClient, request } from "./api-client";

export { request };

export const sources = {
  list: apiClient.media.sources,
  play: apiClient.media.play,
};

export const subtitles = {
  search: apiClient.subtitles.search,
  downloadUrl: apiClient.subtitles.downloadUrl,
  streamUrl: apiClient.subtitles.streamUrl,
};

export const mappings = {
  list: apiClient.mappings.list,
  create: apiClient.mappings.create,
  update: apiClient.mappings.update,
  remove: apiClient.mappings.remove,
};

export const observability = {
  reportError: apiClient.observability.reportError,
  reportLog: apiClient.observability.reportLog,
};
