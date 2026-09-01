/** Cache local das conversas para abrir o Messenger mesmo sem internet. */
import type { Contato, Conversa, Grupo, Mensagem, Perfil } from "@/lib/msn";

const CHAVE_LISTAS = "msn-cache-listas";
const CHAVE_CONVERSA = "msn-cache-conversa:";
const LIMITE = 60;

type Listas = { perfil: Perfil | null; contatos: Contato[]; grupos: Grupo[]; em: number };

function ler<T>(chave: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento cheio: ignora */
  }
}

export function salvarListas(parcial: Partial<Omit<Listas, "em">>) {
  const atual = ler<Listas>(CHAVE_LISTAS);
  gravar(CHAVE_LISTAS, {
    perfil: parcial.perfil ?? atual?.perfil ?? null,
    contatos: parcial.contatos ?? atual?.contatos ?? [],
    grupos: parcial.grupos ?? atual?.grupos ?? [],
    em: Date.now(),
  } satisfies Listas);
}

export function lerListas(): Listas | null {
  return ler<Listas>(CHAVE_LISTAS);
}

function chaveConversa(c: Conversa) {
  return `${CHAVE_CONVERSA}${c.tipo}:${c.id}`;
}

export function salvarConversa(c: Conversa, mensagens: Mensagem[]) {
  gravar(chaveConversa(c), mensagens.slice(-LIMITE));
}

export function lerConversa(c: Conversa): Mensagem[] {
  return ler<Mensagem[]>(chaveConversa(c)) ?? [];
}

export function limparCache() {
  if (typeof window === "undefined") return;
  const chaves = Object.keys(window.localStorage).filter(
    (k) => k === CHAVE_LISTAS || k.startsWith(CHAVE_CONVERSA),
  );
  chaves.forEach((k) => window.localStorage.removeItem(k));
}

export function estaOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}
