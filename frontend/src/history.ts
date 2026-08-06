// Local export history. Stored on-device only (AsyncStorage) as a JSON string,
// since the typed storage helper only accepts primitive values.

import { storage } from "@/src/utils/storage";

const KEY = "export_history_v1";
const MAX = 10;

export type ExportRecord = {
  id: string;
  fileName: string;
  count: number;
  at: string; // ISO timestamp
  vcf: string; // raw vCard payload for re-share
};

export async function getHistory(): Promise<ExportRecord[]> {
  const raw = await storage.getItem<string>(KEY, "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExportRecord[]) : [];
  } catch {
    return [];
  }
}

export async function addHistory(rec: ExportRecord): Promise<ExportRecord[]> {
  const list = await getHistory();
  const next = [rec, ...list].slice(0, MAX);
  await storage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await storage.removeItem(KEY);
}
