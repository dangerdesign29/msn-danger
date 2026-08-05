/** Notificacoes do navegador (permissao + exibicao) para o Messenger. */
const CHAVE_PEDIDO = "msn-notificacao-pedida";

export function suportaNotificacao() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoAtual(): NotificationPermission | "indisponivel" {
  if (!suportaNotificacao()) return "indisponivel";
  return Notification.permission;
}

export function jaPerguntou() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CHAVE_PEDIDO) === "1";
}

export function marcarPerguntou() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE_PEDIDO, "1");
}

export async function pedirPermissao(): Promise<NotificationPermission | "indisponivel"> {
  if (!suportaNotificacao()) return "indisponivel";
  marcarPerguntou();
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function mostrarNotificacao(titulo: string, corpo: string, icone?: string) {
  if (!suportaNotificacao() || Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    const n = new Notification(titulo, {
      body: corpo,
      icon: icone ?? "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "msn-mensagem",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignora */
  }
}