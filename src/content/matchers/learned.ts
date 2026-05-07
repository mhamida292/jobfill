import type { FieldSignature, Mapping, FillKind } from "../../shared/types";

export interface LearnedMatch { fills_with: FillKind; }

export function matchLearned(sig: FieldSignature, mappings: Mapping[]): LearnedMatch | null {
  for (const key of ["id", "name", "label"] as const) {
    const v = sig[key];
    if (!v) continue;
    const hit = mappings.find(m => m.field_signature[key] === v);
    if (hit) return { fills_with: hit.fills_with };
  }
  return null;
}
