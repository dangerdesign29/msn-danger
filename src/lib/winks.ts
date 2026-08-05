import { FIGURINHAS, acharFigurinha, type Figurinha } from "@/lib/pacotes";

export type Wink = Figurinha;

export const WINKS: Wink[] = FIGURINHAS;

export function acharWink(id: string): Wink | undefined {
  return acharFigurinha(id);
}