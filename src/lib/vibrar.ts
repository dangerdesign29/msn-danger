/** Vibracao tatil no celular — usada em toques, winks, chamadas e mensagens. */
export type PadraoVibracao = number | number[];

export const PADROES = {
  toque: [80, 60, 80, 60, 200],
  wink: [40, 40, 120],
  mensagem: [30],
  chamada: [400, 200, 400, 200],
  clique: [12],
  enviado: [15],
  erro: [60, 40, 60],
} satisfies Record<string, PadraoVibracao>;

const CHAVE = "msn-vibracao";

export function vibracaoAtiva() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CHAVE) !== "off";
}

export function definirVibracao(ativa: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, ativa ? "on" : "off");
}

export function vibrar(padrao: PadraoVibracao = PADROES.clique) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!vibracaoAtiva()) return;
  try {
    navigator.vibrate(padrao);
  } catch {
    /* ignora */
  }
}

export function pararVibracao() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(0);
  } catch {
    /* ignora */
  }
}
