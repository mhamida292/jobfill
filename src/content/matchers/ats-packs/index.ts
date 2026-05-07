import type { FieldSignature, FillKind } from "../../../shared/types";
import { greenhousePack } from "./greenhouse";

export interface AtsPack {
  name: string;
  matches(host: string): boolean;
  match(sig: FieldSignature): { fills_with: FillKind; tags?: string[] } | null;
}

export const ATS_PACKS: AtsPack[] = [greenhousePack];
