/** Fila local de envio: guarda mensagens feitas sem internet e envia quando volta. */
import { supabase } from "@/integrations/supabase/client";

export type Pendente = {
  id: string;
  conversaTipo: "dm" | "grupo";
  conversaId: string;
  mensagem: string;
  tipo: string;
  responde_a: string | null;
  criado_em: string;
};

const CHAVE = "msn-fila-envio";

export function lerFila(): Pendente[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Pendente[]) : [];
  } catch {
    return [];
  }
}

function gravar(lista: Pendente[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista.slice(-100)));
  } catch {
    /* ignora */
  }
}

export function enfileirar(item: Omit<Pendente, "id" | "criado_em">): Pendente {
  const completo: Pendente = {
    ...item,
    id: `fila-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    criado_em: new Date().toISOString(),
  };
  gravar([...lerFila(), completo]);
  return completo;
}

export function removerDaFila(id: string) {
  gravar(lerFila().filter((p) => p.id !== id));
}

/** Tenta enviar tudo que está parado. Retorna quantas mensagens sairam. */
export async function esvaziarFila(usuarioId: string): Promise<number> {
  const fila = lerFila();
  if (fila.length === 0) return 0;
  let enviadas = 0;
  for (const item of fila) {
    const { error } = await supabase.from("mensagens").insert({
      remetente_id: usuarioId,
      destinatario_id: item.conversaTipo === "dm" ? item.conversaId : null,
      grupo_id: item.conversaTipo === "grupo" ? item.conversaId : null,
      mensagem: item.mensagem,
      tipo: item.tipo,
      responde_a: item.responde_a,
    });
    if (error) break;
    removerDaFila(item.id);
    enviadas += 1;
  }
  return enviadas;
}
