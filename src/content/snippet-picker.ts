import type { Snippet } from "../shared/types";

export interface RankingContext {
  fieldTags: string[];
  questionText: string;
  filter?: string;
  recentlyUsedIds?: string[];
}

export interface RankedSnippet {
  snippet: Snippet;
  score: number;
}

const STOP = new Set([
  "a","an","the","of","and","or","to","in","is","are","i","you","we",
  "with","for","on","at","by","be","this","that","my","our","your",
  "about","tell","us","why","what","how",
]);

export function rankSnippets(snippets: Snippet[], ctx: RankingContext): RankedSnippet[] {
  let candidates = snippets;
  if (ctx.filter) {
    const f = ctx.filter.toLowerCase();
    candidates = snippets.filter(s =>
      s.label.toLowerCase().includes(f) ||
      s.body.toLowerCase().includes(f) ||
      s.tags.some(t => t.toLowerCase().includes(f)));
  }

  const qTokens = tokenize(ctx.questionText);
  const recent = new Set(ctx.recentlyUsedIds ?? []);

  const ranked = candidates.map(s => {
    const tagOverlap = ctx.fieldTags.filter(t => s.tags.includes(t)).length;
    const tokenOverlap = countOverlap(qTokens, tokenize(s.body));
    const recencyBonus = recent.has(s.id) ? 0.5 : 0;
    const score = tagOverlap * 100 + tokenOverlap + recencyBonus;
    return { snippet: s, score };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.snippet.id.localeCompare(a.snippet.id);
  });

  return ranked;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z]{3,}/g)?.filter(t => !STOP.has(t)) ?? [];
}

function countOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter(t => setB.has(t)).length;
}
