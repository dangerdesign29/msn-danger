import { useMemo, useState } from "react";

import { FIGURINHAS, PACOTES, type Figurinha } from "@/lib/pacotes";
import { PADROES, vibrar } from "@/lib/vibrar";

type Props = {
  onClose: () => void;
  onEnviar: (wink: Figurinha) => void;
};

export function WinksModal({ onClose, onEnviar }: Props) {
  const [pacote, setPacote] = useState<string>("Todos");
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return FIGURINHAS.filter(
      (f) =>
        (pacote === "Todos" || f.pacote === pacote) &&
        (!termo || f.nome.toLowerCase().includes(termo) || f.frase.toLowerCase().includes(termo)),
    );
  }, [pacote, busca]);

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[460px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>⚡ Figurinhas animadas e Winks</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="msn-body">
          <input
            className="msn-input mb-2"
            placeholder="Buscar figurinha..."
            aria-label="Buscar figurinha"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
            {["Todos", ...PACOTES].map((p) => (
              <button
                key={p}
                type="button"
                className={`msn-aba ${pacote === p ? "ativa" : ""}`}
                onClick={() => {
                  setPacote(p);
                  vibrar(PADROES.clique);
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid max-h-[50vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
            {lista.map((w) => (
              <button
                key={w.id}
                type="button"
                className="msn-wink-card"
                title={w.frase}
                onClick={() => {
                  vibrar(PADROES.wink);
                  onEnviar(w);
                }}
              >
                <span className={`msn-wink-emoji msn-anim-${w.anim}`}>{w.emoji}</span>
                <span className="msn-wink-nome">{w.nome}</span>
              </button>
            ))}
            {lista.length === 0 && (
              <p className="col-span-full p-4 text-center text-[11px] text-[#888]">
                Nenhuma figurinha encontrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}