import { getSources, getSourceById } from "../lib/sources/registry";
import type { ResolveParams, PlayResponse } from "@owlite/types";

export function listSources() {
  return getSources().map((s) => ({ id: s.id, name: s.name, description: s.description }));
}

export async function resolveMedia(
  sourceId: string,
  params: ResolveParams,
): Promise<PlayResponse> {
  const source = getSourceById(sourceId);
  if (!source) throw Object.assign(new Error("Source not found"), { statusCode: 404 });
  const result = await source.resolve(params);
  if (!result) {
    throw Object.assign(new Error("Source could not resolve media"), { statusCode: 422 });
  }
  return result;
}
