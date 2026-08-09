import beginSound from "@/assets/begin.wav.asset.json";
import dialogSound from "@/assets/dialog.wav.asset.json";
import promptSound from "@/assets/dialogprompt.wav.asset.json";
import slideSound from "@/assets/slidedown.wav.asset.json";
import tileSound from "@/assets/tileselect.wav.asset.json";
import goodbyeSound from "@/assets/goodbye.wav.asset.json";

export type Status = "online" | "ocupado" | "ausente" | "offline";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  status: string;
  musica: string | null;
};

export type Contato = Perfil & { apelido: string | null };

export type Mensagem = {
  id: string;
  remetente_id: string;
  destinatario_id: string | null;
  grupo_id: string | null;
  mensagem: string;
  tipo: string;
  lida: boolean;
  enviada_em: string;
  lida_em: string | null;
  entregue_em: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
  anexo_tipo: string | null;
  anexo_tamanho: number | null;
  responde_a?: string | null;
  /** Mensagem ainda na fila local (sem internet). */
  pendente?: boolean;
};

export type Grupo = {
  id: string;
  nome: string;
  descricao: string | null;
  avatar_url: string | null;
  dono_id: string;
};

export type Conversa =
  | { tipo: "dm"; id: string; nome: string; avatar: string | null; status: string }
  | { tipo: "grupo"; id: string; nome: string; avatar: string | null; status: string };

export const STATUS_LABEL: Record<string, string> = {
  online: "🟢 Online",
  ocupado: "🔴 Ocupado",
  ausente: "🟡 Ausente",
  offline: "⚫ Invisível",
};

const SOUND_URLS = {
  login: beginSound.url,
  message: dialogSound.url,
  send: tileSound.url,
  nudge: slideSound.url,
  wink: promptSound.url,
  logout: goodbyeSound.url,
};

export type SoundName = keyof typeof SOUND_URLS;

export function playSound(name: SoundName) {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(SOUND_URLS[name]);
    audio.volume = 0.5;
    void audio.play().catch(() => {});
  } catch {
    /* ignora */
  }
}

export const EMOTICONS: Record<string, string> = {
  ":)": "😊",
  ":D": "😄",
  ";)": "😉",
  ":(": "😢",
  ":P": "😛",
  ":O": "😮",
  ":S": "😕",
  ":v": "😜",
  "8)": "😎",
  ":*": "😘",
  ":@": "😡",
  ":|": "😐",
  ":3": "😺",
  "<3": "❤️",
  "(y)": "👍",
  "(n)": "👎",
  "(l)": "❤️",
  "(u)": "💔",
  "(k)": "😘",
  "(h)": "❤️‍🔥",
  "(a)": "😇",
  "(m)": "🤐",
  "(z)": "😴",
  "(w)": "😈",
  "(c)": "☕",
  "(f)": "🌹",
  "(d)": "🍺",
  "(b)": "☀️",
  "(t)": "🐢",
  "(r)": "🌈",
  "(p)": "📷",
  "(e)": "📧",
  "(o)": "⏰",
  "(s)": "🌙",
  "(i)": "💡",
  "(x)": "🔇",
  "(^)": "🎂",
};

export const EMOTICON_PALETTE = [
  "😊", "😄", "😉", "😢", "😛", "😮", "😕", "😜",
  "😎", "😘", "😡", "😐", "😺", "❤️", "👍", "👎",
  "💔", "😇", "🤐", "😴", "😈", "☕", "🌹", "🍺",
  "☀️", "🐢", "🌈", "📷", "📧", "⏰", "🌙", "💡",
];

export function formatarMensagem(texto: string) {
  let resultado = texto;
  for (const codigo of Object.keys(EMOTICONS)) {
    resultado = resultado.split(codigo).join(EMOTICONS[codigo]!);
  }
  return resultado;
}

export function formatarHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Redimensiona a foto escolhida para um avatar pequeno em data URL. */
export function arquivoParaAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        const menor = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - menor) / 2,
          (img.height - menor) / 2,
          menor,
          menor,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}