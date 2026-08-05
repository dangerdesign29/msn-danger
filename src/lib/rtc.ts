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
  ],
};

export function canalPessoal(userId: string) {
  return `msn-sinal-${userId}`;
}

/** Envia um sinal para o canal pessoal do outro usuario. */
export async function enviarSinal(paraId: string, payload: Sinal) {
  const canal = supabase.channel(canalPessoal(paraId));
  await new Promise<void>((resolve) => {
    canal.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        resolve();
      }
    });
  });
  await canal.send({ type: "broadcast", event: "sinal", payload });
  setTimeout(() => void supabase.removeChannel(canal), 1500);
}