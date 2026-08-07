import { supabase } from "@/integrations/supabase/client";

/** Payloads trocados entre dois usuarios (chamadas e jogos) via canal em tempo real. */
export type Sinal =
  | {
      tipo: "chamada-oferta";
      de: string;
      nome: string;
      video: boolean;
      sdp: RTCSessionDescriptionInit;
    }
  | { tipo: "chamada-resposta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "chamada-ice"; de: string; candidato: RTCIceCandidateInit }
  | { tipo: "chamada-fim"; de: string; motivo?: string }
  | { tipo: "chamada-recusada"; de: string }
  | { tipo: "jogo-convite"; de: string; nome: string; jogo: string }
  | { tipo: "jogo-aceito"; de: string; jogo: string }
  | { tipo: "jogo-recusado"; de: string }
  | { tipo: "jogo-jogada"; de: string; jogo: string; dados: unknown }
  | { tipo: "jogo-fim"; de: string };

export const SERVIDORES_ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    // TURN publico (Open Relay) — garante conexao mesmo atras de NAT/4G.
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 4,
};

/** Canal compartilhado por uma conversa (usado pelo indicador de digitando). */
export function canalConversa(tipo: "dm" | "grupo", id: string, meuId: string) {
  if (tipo === "grupo") return `msn-digitando-grupo-${id}`;
  const par = [meuId, id].sort();
  return `msn-digitando-dm-${par[0]}-${par[1]}`;
}

export function canalPessoal(userId: string) {
  return `msn-sinal-${userId}`;
}

/**
 * Canais de envio reaproveitados por destinatario. Recriar canal a cada sinal
 * atrasava (ou perdia) candidatos ICE — o que fazia a chamada nao conectar.
 */
const canaisEnvio = new Map<
  string,
  { canal: ReturnType<typeof supabase.channel>; pronto: Promise<void> }
>();

function obterCanalEnvio(paraId: string) {
  const nome = canalPessoal(paraId);
  const existente = canaisEnvio.get(nome);
  if (existente) return existente;
  const canal = supabase.channel(nome, { config: { broadcast: { self: false } } });
  const pronto = new Promise<void>((resolve) => {
    canal.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        resolve();
      }
    });
  });
  const registro = { canal, pronto };
  canaisEnvio.set(nome, registro);
  return registro;
}

/** Envia um sinal para o canal pessoal do outro usuario. */
export async function enviarSinal(paraId: string, payload: Sinal) {
  const { canal, pronto } = obterCanalEnvio(paraId);
  await pronto;
  await canal.send({ type: "broadcast", event: "sinal", payload });
}

/** Libera o canal de sinalizacao quando a chamada/jogo termina. */
export function fecharCanalSinal(paraId: string) {
  const nome = canalPessoal(paraId);
  const registro = canaisEnvio.get(nome);
  if (!registro) return;
  canaisEnvio.delete(nome);
  void supabase.removeChannel(registro.canal);
}