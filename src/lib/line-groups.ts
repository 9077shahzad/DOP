/**
 * Quote positions grouped for reading: everything about the move first, then
 * cleaning, then disposal, then anything else. Order only — amounts, labels
 * and totals are untouched, so the positions still sum to the Zwischentotal.
 */
export type LineGroup = "move" | "clean" | "disp" | "other";

export const LINE_GROUP_ORDER: LineGroup[] = ["move", "clean", "disp", "other"];

export function lineGroup(id: string): LineGroup {
  if (id === "move" || id === "pack" || id.startsWith("extra_")) return "move";
  if (id === "clean" || id.startsWith("clean_")) return "clean";
  if (id === "disp" || id.startsWith("disp_")) return "disp";
  return "other";
}

/** Stable sort by group; positions inside a group keep their engine order. */
export function groupLines<T extends { id: string }>(lines: readonly T[]): T[] {
  return lines
    .map((line, index) => ({ line, index, rank: LINE_GROUP_ORDER.indexOf(lineGroup(line.id)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.line);
}
