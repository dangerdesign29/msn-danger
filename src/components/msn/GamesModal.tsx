import { useState } from "react";

const JOGOS: Record<string, { titulo: string; texto: string }> = {
  velha: {
    titulo: "❌⭕ Jogo da Velha",
    texto: 'Convide o amigo para jogar! Diga "Joguei X na posição 1".',
  },
  forca: {
    titulo: "💀 Jogo da Forca",
    texto: "Pense em uma palavra e diga quantas letras tem!",
  },
  naval: {
    titulo: "🚢 Batalha Naval",
    texto: "Posicione seus navios mentalmente e diga as coordenadas!",
  },
};

export function GamesModal({
  nomeContato,
  onClose,
}: {
  nomeContato: string;
  onClose: () => void;
}) {
  const [jogo, setJogo] = useState<string | null>(null);

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[420px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>Jogos - MSN</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="msn-body text-center">
          <h3 className="text-[16px] font-bold text-[#333]">🎮 Jogos com {nomeContato}</h3>
          <p className="mb-3 text-[12px] text-[#666]">Escolha um jogo:</p>

          {Object.entries(JOGOS).map(([chave, dados]) => (
            <button
              key={chave}
              type="button"
              onClick={() => setJogo(chave)}
              className="mx-auto my-2 block w-[250px] max-w-full cursor-pointer rounded-lg border-2 border-[#0054e3] bg-white p-3 text-[15px] text-[#222] transition-colors hover:bg-[#e8f0fe]"
            >
              {dados.titulo}
            </button>
          ))}

          {jogo && (
            <div className="mt-4">
              <h4 className="text-[14px] font-bold text-[#333]">{JOGOS[jogo]!.titulo}</h4>
              <p className="text-[12px] text-[#666]">{JOGOS[jogo]!.texto}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}