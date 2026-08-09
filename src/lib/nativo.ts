/** Suporte a app nativo (Android/iOS via Capacitor). No navegador tudo vira no-op. */

type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string };

function cap(): Cap | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: Cap }).Capacitor ?? null;
}

export function ehNativo(): boolean {
  const c = cap();
  return !!c?.isNativePlatform?.();
}

export function plataformaNativa(): "android" | "ios" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
}

export async function pedirPermissaoNativa(): Promise<boolean> {
  if (!ehNativo()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const atual = await LocalNotifications.checkPermissions();
    if (atual.display === "granted") return true;
    const pedida = await LocalNotifications.requestPermissions();
    return pedida.display === "granted";
  } catch {
    return false;
  }
}

let seq = 1;

/** Mostra uma notificacao real na bandeja do celular. */
export async function notificarNativo(titulo: string, corpo: string, urgente = false) {
  if (!ehNativo()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const permitido = await pedirPermissaoNativa();
    if (!permitido) return false;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: seq++,
          title: titulo,
          body: corpo,
          smallIcon: "ic_stat_icon_config_sample",
          iconColor: "#0054e3",
          ongoing: false,
          autoCancel: true,
          extra: { url: "/messenger", urgente },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function vibrarNativo(forte = false) {
  if (!ehNativo()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: forte ? ImpactStyle.Heavy : ImpactStyle.Light });
  } catch {
    /* ignora */
  }
}