import type { FieldSignature, Mapping, MatchConfidence, FillKind } from "../../shared/types";
import { matchLearned } from "./learned";
import { matchHeuristic } from "./heuristics";
import { ATS_PACKS } from "./ats-packs";

export interface CascadeMatch {
  fills_with: FillKind;
  confidence: MatchConfidence;
  source: "learned" | "ats_pack" | "heuristic";
  ats_pack?: string;
  tags: string[];
}

export function runCascade(
  sig: FieldSignature,
  learnedMappings: Mapping[],
  host: string,
): CascadeMatch | null {
  const learned = matchLearned(sig, learnedMappings);
  if (learned) {
    return { fills_with: learned.fills_with, confidence: "high", source: "learned", tags: [] };
  }

  for (const pack of ATS_PACKS) {
    if (!pack.matches(host)) continue;
    const r = pack.match(sig);
    if (r) return { fills_with: r.fills_with, confidence: "medium", source: "ats_pack", ats_pack: pack.name, tags: r.tags ?? [] };
  }

  const heur = matchHeuristic(sig);
  if (heur) return { fills_with: heur.fills_with, confidence: "low", source: "heuristic", tags: heur.tags };

  return null;
}
