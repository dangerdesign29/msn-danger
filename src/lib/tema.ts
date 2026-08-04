export type Tema = {
  preset: string;
  cor: string;
  corBalao: string;
  fonte: string;
  tamanho: number;
};

export const FONTES = [
  { id: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', nome: "Segoe UI (padrão)" },
  { id: "Tahoma, sans-serif", nome: "Tahoma (MSN clássico)" },
  { id: '"Comic Sans MS", "Comic Sans", cursive', nome: "Comic Sans MS" },
  { id: "Verdana, sans-serif", nome: "Verdana" },
  { id: '"Trebuchet MS", sans-serif', nome: "Trebuchet MS" },
  { id: '"Courier New", monospace', nome: "Courier New" },
  { id: "Georgia, serif", nome: "Georgia" },
];

export const PRESETS: { id: string; nome: string; cor: string; corBalao: string }[] = [
  { id: "classico", nome: "MSN Clássico (azul)", cor: "#0054e3", corBalao: "#e3f2fd" },
  { id: "verde", nome: "Messenger 7.5 (verde)", cor: "#2e8b2e", corBalao: "#e6f7e0" },
  { id: "rosa", nome: "Rosa Choque", cor: "#d6238c", corBalao: "#ffe4f3" },
  { id: "laranja", nome: "Laranja Live", cor: "#e06c00", corBalao: "#fff0dd" },
  { id: "grafite", nome: "Vista Aero (grafite)", cor: "#3a4a5c", corBalao: "#e8edf3" },
  { id: "roxo", nome: "Roxo Retrô", cor: "#6b2fb5", corBalao: "#efe6ff" },
];

export const TEMA_PADRAO: Tema = {
  preset: "classico",
  cor: "#0054e3",
  corBalao: "#e3f2fd",
  fonte: FONTES[0]!.id,
  tamanho: 13,
};

const CHAVE = "msn-tema";

function clarear(hex: string, fator: number) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.round(fator >= 0 ? c + (255 - c) * fator : c * (1 + fator))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export function aplicarTema(tema: Tema) {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement;
  const claro = clarear(tema.cor, 0.35);
  const maisClaro = clarear(tema.cor, 0.55);
  const escuro = clarear(tema.cor, -0.35);

  raiz.style.setProperty("--msn-blue", tema.cor);
  raiz.style.setProperty("--msn-blue-deep", escuro);
  raiz.style.setProperty(
    "--msn-titlebar",
    `linear-gradient(180deg, ${tema.cor} 0%, ${maisClaro} 8%, ${claro} 30%, ${tema.cor} 50%, ${escuro} 92%, ${escuro} 100%)`,
  );
  raiz.style.setProperty(
    "--msn-btn",
    `linear-gradient(180deg, ${maisClaro} 0%, ${claro} 50%, ${tema.cor} 100%)`,
  );
  raiz.style.setProperty(
    "--msn-btn-hover",
    `linear-gradient(180deg, ${clarear(tema.cor, 0.7)} 0%, ${maisClaro} 50%, ${claro} 100%)`,
  );
  raiz.style.setProperty(
    "--msn-desktop",
    `linear-gradient(135deg, ${claro} 0%, ${tema.cor} 50%, ${escuro} 100%)`,
  );
  raiz.style.setProperty("--msn-balao", tema.corBalao);
  raiz.style.setProperty("--msn-balao-borda", clarear(tema.cor, 0.6));
  raiz.style.setProperty("--font-msn", tema.fonte);
  raiz.style.setProperty("--msn-texto", `${tema.tamanho}px`);
}

export function lerTemaLocal(): Tema {
  if (typeof window === "undefined") return TEMA_PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return TEMA_PADRAO;
    return { ...TEMA_PADRAO, ...(JSON.parse(bruto) as Partial<Tema>) };
  } catch {
    return TEMA_PADRAO;
  }
}

export function salvarTemaLocal(tema: Tema) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(tema));
  } catch {
    /* ignora */
  }
}