/** Notificacoes push reais (Service Worker + Web Push). */
import { chavePush, removerAssinatura, salvarAssinatura } from "@/lib/push.functions";

const CAMINHO_SW = "/push-sw.js";

export function suportaPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function base64ParaUint8(base64: string) {
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const normal = preenchido.replace(/-/g, "+").replace(/_/g, "/");
  const bruto = window.atob(normal);
  const saida = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i += 1) saida[i] = bruto.charCodeAt(i);
  return saida;
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!suportaPush()) return null;
  try {
    return await navigator.serviceWorker.register(CAMINHO_SW, { scope: "/" });
  } catch {
    return null;
  }
}

/** Assina o aparelho para receber avisos com o app fechado. */
export async function ativarPush(): Promise<"ok" | "negado" | "indisponivel"> {
  if (!suportaPush()) return "indisponivel";
  if (Notification.permission !== "granted") {
    const r = await Notification.requestPermission();
    if (r !== "granted") return "negado";
  }
  const registro = (await registrarServiceWorker()) ?? (await navigator.serviceWorker.ready);
  if (!registro) return "indisponivel";
  await navigator.serviceWorker.ready;

  const { chave } = await chavePush();
  if (!chave) return "indisponivel";

  let assinatura = await registro.pushManager.getSubscription();
  if (!assinatura) {
    try {
      assinatura = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8(chave) as BufferSource,
      });
    } catch {
      return "indisponivel";
    }
  }

  const bruto = assinatura.toJSON();
  if (!bruto.endpoint || !bruto.keys?.["p256dh"] || !bruto.keys?.["auth"]) return "indisponivel";
  await salvarAssinatura({
    data: {
      endpoint: bruto.endpoint,
      p256dh: bruto.keys["p256dh"],
      auth: bruto.keys["auth"],
    },
  });
  return "ok";
}

export async function desativarPush() {
  if (!suportaPush()) return;
  const registro = await navigator.serviceWorker.getRegistration(CAMINHO_SW);
  const assinatura = await registro?.pushManager.getSubscription();
  if (!assinatura) return;
  await removerAssinatura({ data: { endpoint: assinatura.endpoint } });
  await assinatura.unsubscribe();
}