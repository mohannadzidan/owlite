import fs from "fs";
import path from "path";
import type { LocalMapping } from "@owlite/types";

const MAPPINGS_FILE = path.join(process.cwd(), "data", "local_mappings.json");

function readMappings(): LocalMapping[] {
  if (!fs.existsSync(MAPPINGS_FILE)) return [];
  return JSON.parse(fs.readFileSync(MAPPINGS_FILE, "utf-8")) as LocalMapping[];
}

function writeMappings(mappings: LocalMapping[]): void {
  fs.mkdirSync(path.dirname(MAPPINGS_FILE), { recursive: true });
  fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

export function listMappings(): LocalMapping[] {
  return readMappings();
}

export function createMapping(mapping: LocalMapping): LocalMapping {
  const mappings = readMappings();
  mappings.push(mapping);
  writeMappings(mappings);
  return mapping;
}

export function updateMapping(tmdbId: number, patch: Partial<LocalMapping>): boolean {
  const mappings = readMappings();
  const idx = mappings.findIndex((m) => m.tmdb_id === tmdbId);
  if (idx === -1) return false;
  mappings[idx] = { ...mappings[idx], ...patch };
  writeMappings(mappings);
  return true;
}

export function deleteMapping(tmdbId: number): boolean {
  const mappings = readMappings();
  const filtered = mappings.filter((m) => m.tmdb_id !== tmdbId);
  if (filtered.length === mappings.length) return false;
  writeMappings(filtered);
  return true;
}
