import { PADROES, vibrar } from "@/lib/vibrar";

export const JOGOS = [
  { id: "velha", titulo: "❌⭕ Jogo da Velha", desc: "Clássico 3x3 online, em tempo real" },
  { id: "pedra", titulo: "✊✋✌️ Pedra, Papel e Tesoura", desc: "Melhor de várias rodadas" },
  { id: "memoria", titulo: "🃏 Jogo da Memória", desc: "Ache os pares alternando a vez" },
] as const;

export type JogoId = (typeof JOGOS)[number]["id"];

export function GamesModal({
  nomeContato,
  aguardando,
  onConvidar,
  onClose,
}: {
  nomeContato: string;
  aguardando: boolean;
  onConvidar: (jogo: JogoId) => void;
  onClose: () => void;
}) {
  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[420px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>🎮 Jogos online</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="msn-body text-center">
          <h3 className="text-[16px] font-bold text-[#333]">Jogar com {nomeContato}</h3>
          {aguardando ? (
            <p className="msn-typing my-6 text-[13px] text-[#555]">
              Convite enviado… aguardando {nomeContato} aceitar 🎲
            </p>
          ) : (
            <>
              <p className="mb-3 text-[12px] text-[#666]">Escolha um jogo para convidar:</p>
              {JOGOS.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => {
                    vibrar(PADROES.clique);
                    onConvidar(j.id);
                  }}
                  className="mx-auto my-2 block w-[280px] max-w-full cursor-pointer rounded-lg border-2 border-[#0054e3] bg-white p-3 text-left transition-colors hover:bg-[#e8f0fe]"
                >
                  <span className="block text-[15px] font-bold text-[#222]">{j.titulo}</span>
                  <span className="block text-[11px] text-[#666]">{j.desc}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
