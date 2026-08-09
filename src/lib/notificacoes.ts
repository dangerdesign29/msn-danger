/** Notificacoes do navegador (permissao + exibicao) para o Messenger. */
import { ehNativo, notificarNativo, pedirPermissaoNativa } from "./nativo";

const CHAVE_PEDIDO = "msn-notificacao-pedida";

export function suportaNotificacao() {
  if (ehNativo()) return true;
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoAtual(): NotificationPermission | "indisponivel" {
  if (ehNativo()) return "granted";
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
  if (ehNativo()) {
    marcarPerguntou();
    return (await pedirPermissaoNativa()) ? "granted" : "denied";
  }
  if (!suportaNotificacao()) return "indisponivel";
  marcarPerguntou();
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

type Extras = { icone?: string; tag?: string; sempre?: boolean; urgente?: boolean };

/**
 * Mostra a notificacao pelo Service Worker quando disponivel (obrigatorio no
 * Android/PWA, onde `new Notification` lanca erro) e cai para o construtor
 * classico no desktop.
 */
export function mostrarNotificacao(titulo: string, corpo: string, extras: Extras | string = {}) {
  const op: Extras = typeof extras === "string" ? { icone: extras } : extras;
  if (!op.sempre && typeof document !== "undefined" && document.visibilityState === "visible") {
    return;
  }

  if (ehNativo()) {
    void notificarNativo(titulo, corpo, op.urgente ?? false);
    return;
  }

  if (!suportaNotificacao() || Notification.permission !== "granted") return;

  const opcoes: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: corpo,
    icon: op.icone ?? "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: op.tag ?? "msn-mensagem",
    renotify: true,
    requireInteraction: op.urgente ?? false,
    vibrate: op.urgente ? [200, 100, 200, 100, 200] : [80, 60, 80],
    data: { url: "/messenger" },
  };

  const classica = () => {
    try {
      const n = new Notification(titulo, opcoes);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      /* ignora */
    }
  };

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    void navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        const alvo = reg ?? (await navigator.serviceWorker.ready.catch(() => null));
        if (alvo) {
          await alvo.showNotification(titulo, opcoes);
          return;
        }
        classica();
      })
      .catch(() => classica());
    return;
  }

  classica();
}
