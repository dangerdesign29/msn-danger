import { WINKS, type Wink } from "@/lib/winks";

type Props = {
  onClose: () => void;
  onEnviar: (wink: Wink) => void;
};

export function WinksModal({ onClose, onEnviar }: Props) {
  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[440px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>⚡ Galeria de Winks</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="msn-body">
          <p className="mb-2 text-[11px] text-[#666]">
            Clique para enviar uma figurinha animada com som — igual aos winks originais.
          </p>
          <div className="grid max-h-[50vh] grid-cols-4 gap-2 overflow-y-auto">
            {WINKS.map((w) => (
              <button
                key={w.id}
                type="button"
                className="msn-wink-card"
                title={w.frase}
                onClick={() => onEnviar(w)}
              >
                <span className={`msn-wink-emoji msn-anim-${w.anim}`}>{w.emoji}</span>
                <span className="msn-wink-nome">{w.nome}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}