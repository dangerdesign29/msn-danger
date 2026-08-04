import type { SoundName } from "@/lib/msn";

export type Wink = {
  id: string;
  nome: string;
  emoji: string;
  anim: "zoom" | "girar" | "pular" | "tremer" | "flutuar" | "pulsar";
  som: SoundName;
  frase: string;
};

export const WINKS: Wink[] = [
  { id: "beijo", nome: "Beijo", emoji: "💋", anim: "zoom", som: "wink", frase: "Mandou um beijo!" },
  { id: "coracao", nome: "Chuva de corações", emoji: "💖", anim: "flutuar", som: "wink", frase: "Corações pra você!" },
  { id: "risada", nome: "Gargalhada", emoji: "🤣", anim: "pular", som: "wink", frase: "HAHAHAHA!" },
  { id: "tapa", nome: "Tapa na cara", emoji: "🖐️", anim: "tremer", som: "nudge", frase: "Levou um tapa!" },
  { id: "bomba", nome: "Bomba", emoji: "💣", anim: "zoom", som: "nudge", frase: "BOOM!" },
  { id: "festa", nome: "Festa", emoji: "🎉", anim: "girar", som: "wink", frase: "Hora da festa!" },
  { id: "raio", nome: "Raio", emoji: "⚡", anim: "tremer", som: "wink", frase: "Zap!" },
  { id: "gato", nome: "Gatinho fofo", emoji: "😻", anim: "pulsar", som: "wink", frase: "Que fofura!" },
  { id: "dancar", nome: "Dança", emoji: "🕺", anim: "pular", som: "wink", frase: "Bora dançar!" },
  { id: "cerveja", nome: "Brinde", emoji: "🍻", anim: "girar", som: "wink", frase: "Saúde!" },
  { id: "fogo", nome: "Pegando fogo", emoji: "🔥", anim: "pulsar", som: "wink", frase: "Tá quente!" },
  { id: "chorar", nome: "Choro de rio", emoji: "😭", anim: "flutuar", som: "wink", frase: "Buááá!" },
  { id: "fantasma", nome: "Susto", emoji: "👻", anim: "flutuar", som: "nudge", frase: "Buuu!" },
  { id: "estrela", nome: "Estrelinhas", emoji: "✨", anim: "pulsar", som: "wink", frase: "Brilha!" },
  { id: "foguete", nome: "Foguete", emoji: "🚀", anim: "zoom", som: "nudge", frase: "Decolou!" },
  { id: "pizza", nome: "Pizza", emoji: "🍕", anim: "girar", som: "wink", frase: "Bateu a fome!" },
];

export function acharWink(id: string): Wink | undefined {
  return WINKS.find((w) => w.id === id);
}