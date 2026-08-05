import { useEffect, useState } from "react";

import { PADROES, vibrar } from "@/lib/vibrar";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CHAVE = "msn-instalar-dispensado";

export function InstalarApp() {
  const [evento, setEvento] = useState<PromptInstalacao | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(CHAVE) === "1") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const aoPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as PromptInstalacao);
      setVisivel(true);
    };
    window.addEventListener("beforeinstallprompt", aoPrompt);

    const ehIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (ehIos) {
      setIos(true);
      setVisivel(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", aoPrompt);
  }, []);

  if (!visivel) return null;

  function fechar() {
    window.localStorage.setItem(CHAVE, "1");
    setVisivel(false);
  }

  return (
    <div className="msn-instalar">
      <img src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded" />
      <div className="min-w-0 flex-1 text-[11px] leading-tight text-[#333]">
        <strong className="block text-[12px]">Instalar o MSN no celular</strong>
        {ios
          ? "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”."
          : "Tenha o Messenger com ícone próprio, tela cheia e notificações."}
      </div>
      {!ios && (
        <button
          type="button"
          className="msn-btn px-3 py-1 text-[11px]"
          onClick={async () => {
            vibrar(PADROES.clique);
            if (!evento) return;
            await evento.prompt();
            await evento.userChoice;
            fechar();
          }}
        >
          Instalar
        </button>
      )}
      <button type="button" className="msn-btn-small" aria-label="Dispensar" onClick={fechar}>
        ✕
      </button>
    </div>
  );
}