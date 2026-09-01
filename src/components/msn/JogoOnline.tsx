import { useCallback, useEffect, useRef, useState } from "react";

import { playSound } from "@/lib/msn";
import { enviarSinal, type Sinal } from "@/lib/rtc";
import { PADROES, vibrar } from "@/lib/vibrar";
import type { JogoId } from "@/components/msn/GamesModal";

export type Sessao = {
  jogo: JogoId;
  outroId: string;
  nome: string;
  anfitriao: boolean;
};

type Props = {
  userId: string;
  sessao: Sessao;
  registrarSinal: (fn: ((s: Sinal) => void) | null) => void;
  onClose: () => void;
};

const LINHAS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const EMOJIS_MEMORIA = ["😊", "💋", "🔥", "🍕", "🚀", "😻", "🎉", "⚡"];

function embaralhar<T>(lista: T[], semente: number) {
  const arr = [...lista];
  let s = semente;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function JogoOnline({ userId, sessao, registrarSinal, onClose }: Props) {
  const meuSimbolo = sessao.anfitriao ? "X" : "O";
  const [tabuleiro, setTabuleiro] = useState<(string | null)[]>(Array(9).fill(null));
  const [minhaVez, setMinhaVez] = useState(sessao.anfitriao);
  const [placar, setPlacar] = useState({ eu: 0, ele: 0 });
  const [minhaEscolha, setMinhaEscolha] = useState<string | null>(null);
  const [escolhaDele, setEscolhaDele] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const semente = useRef(Math.floor(Date.now() / 100000));
  const [cartas, setCartas] = useState<string[]>(() =>
    embaralhar([...EMOJIS_MEMORIA, ...EMOJIS_MEMORIA], semente.current),
  );
  const [viradas, setViradas] = useState<number[]>([]);
  const [achadas, setAchadas] = useState<number[]>([]);

  const enviar = useCallback(
    (dados: unknown) => {
      void enviarSinal(sessao.outroId, {
        tipo: "jogo-jogada",
        de: userId,
        jogo: sessao.jogo,
        dados,
      });
    },
    [sessao.outroId, sessao.jogo, userId],
  );

  const vencedor = useCallback((t: (string | null)[]) => {
    for (const [a, b, c] of LINHAS) {
      if (t[a!] && t[a!] === t[b!] && t[a!] === t[c!]) return t[a!];
    }
    return t.every(Boolean) ? "empate" : null;
  }, []);

  useEffect(() => {
    registrarSinal((s) => {
      if (s.tipo === "jogo-fim") {
        onClose();
        return;
      }
      if (s.tipo !== "jogo-jogada") return;
      const d = s.dados as Record<string, unknown>;
      playSound("send");
      vibrar(PADROES.mensagem);

      if (sessao.jogo === "velha") {
        const novo = d["tabuleiro"] as (string | null)[];
        setTabuleiro(novo);
        setMinhaVez(true);
        const v = vencedor(novo);
        if (v)
          setResultado(
            v === "empate"
              ? "Deu velha! 🤝"
              : v === meuSimbolo
                ? "Você venceu! 🏆"
                : "Você perdeu 😢",
          );
      } else if (sessao.jogo === "pedra") {
        setEscolhaDele(d["escolha"] as string);
      } else if (sessao.jogo === "memoria") {
        if (d["reinicio"]) {
          setCartas(embaralhar([...EMOJIS_MEMORIA, ...EMOJIS_MEMORIA], d["semente"] as number));
          setAchadas([]);
          setViradas([]);
          setMinhaVez(!sessao.anfitriao);
          return;
        }
        setCartas((d["cartas"] as string[]) ?? cartas);
        setAchadas((d["achadas"] as number[]) ?? []);
        setViradas((d["viradas"] as number[]) ?? []);
        setMinhaVez(Boolean(d["passaVez"]));
      }
    });
    return () => registrarSinal(null);
  }, [registrarSinal, sessao, vencedor, meuSimbolo, onClose, cartas]);

  // resolve pedra/papel/tesoura quando os dois escolheram
  useEffect(() => {
    if (sessao.jogo !== "pedra" || !minhaEscolha || !escolhaDele) return;
    const vence: Record<string, string> = { pedra: "tesoura", papel: "pedra", tesoura: "papel" };
    if (minhaEscolha === escolhaDele) setResultado("Empate! 🤝");
    else if (vence[minhaEscolha] === escolhaDele) {
      setResultado("Você venceu a rodada! 🏆");
      setPlacar((p) => ({ ...p, eu: p.eu + 1 }));
    } else {
      setResultado("Você perdeu a rodada 😢");
      setPlacar((p) => ({ ...p, ele: p.ele + 1 }));
    }
    const t = setTimeout(() => {
      setMinhaEscolha(null);
      setEscolhaDele(null);
      setResultado(null);
    }, 2200);
    return () => clearTimeout(t);
  }, [minhaEscolha, escolhaDele, sessao.jogo]);

  function jogarVelha(i: number) {
    if (!minhaVez || tabuleiro[i] || resultado) return;
    const novo = [...tabuleiro];
    novo[i] = meuSimbolo;
    setTabuleiro(novo);
    setMinhaVez(false);
    vibrar(PADROES.clique);
    playSound("send");
    enviar({ tabuleiro: novo });
    const v = vencedor(novo);
    if (v)
      setResultado(
        v === "empate" ? "Deu velha! 🤝" : v === meuSimbolo ? "Você venceu! 🏆" : "Você perdeu 😢",
      );
  }

  function reiniciarVelha() {
    const vazio = Array(9).fill(null);
    setTabuleiro(vazio);
    setResultado(null);
    setMinhaVez(sessao.anfitriao);
    enviar({ tabuleiro: vazio });
  }

  function escolherPedra(op: string) {
    if (minhaEscolha) return;
    setMinhaEscolha(op);
    vibrar(PADROES.clique);
    enviar({ escolha: op });
  }

  function virarCarta(i: number) {
    if (!minhaVez || viradas.includes(i) || achadas.includes(i) || viradas.length >= 2) return;
    const novas = [...viradas, i];
    setViradas(novas);
    vibrar(PADROES.clique);
    if (novas.length < 2) {
      enviar({ cartas, achadas, viradas: novas, passaVez: false });
      return;
    }
    const [a, b] = novas;
    const par = cartas[a!] === cartas[b!];
    setTimeout(() => {
      const novasAchadas = par ? [...achadas, a!, b!] : achadas;
      setAchadas(novasAchadas);
      setViradas([]);
      setMinhaVez(par);
      enviar({ cartas, achadas: novasAchadas, viradas: [], passaVez: !par });
    }, 900);
  }

  function sair() {
    void enviarSinal(sessao.outroId, { tipo: "jogo-fim", de: userId });
    onClose();
  }

  const titulo =
    sessao.jogo === "velha"
      ? "❌⭕ Jogo da Velha"
      : sessao.jogo === "pedra"
        ? "✊✋✌️ Pedra, Papel e Tesoura"
        : "🃏 Jogo da Memória";

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[420px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>
              {titulo} — {sessao.nome}
            </span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Sair do jogo" onClick={sair}>
              ✕
            </button>
          </div>
        </div>

        <div className="msn-body text-center">
          {sessao.jogo === "velha" && (
            <>
              <p className="mb-2 text-[12px] text-[#555]">
                Você é <strong>{meuSimbolo}</strong> —{" "}
                {resultado ? resultado : minhaVez ? "sua vez!" : `vez de ${sessao.nome}…`}
              </p>
              <div className="mx-auto grid w-[240px] grid-cols-3 gap-1.5">
                {tabuleiro.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="msn-celula"
                    onClick={() => jogarVelha(i)}
                    aria-label={`Casa ${i + 1}`}
                  >
                    <span className={c ? "msn-anim-zoom inline-block" : ""}>{c ?? ""}</span>
                  </button>
                ))}
              </div>
              {resultado && (
                <button type="button" className="msn-btn-small mt-3 px-3" onClick={reiniciarVelha}>
                  🔄 Jogar de novo
                </button>
              )}
            </>
          )}

          {sessao.jogo === "pedra" && (
            <>
              <p className="mb-2 text-[12px] text-[#555]">
                Placar: você {placar.eu} × {placar.ele} {sessao.nome}
              </p>
              <div className="flex justify-center gap-3">
                {[
                  { id: "pedra", emoji: "✊" },
                  { id: "papel", emoji: "✋" },
                  { id: "tesoura", emoji: "✌️" },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    className={`msn-opcao ${minhaEscolha === op.id ? "ativa" : ""}`}
                    onClick={() => escolherPedra(op.id)}
                  >
                    {op.emoji}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-[#555]">
                {resultado
                  ? resultado
                  : minhaEscolha
                    ? escolhaDele
                      ? "Revelando…"
                      : `Aguardando ${sessao.nome} escolher…`
                    : "Escolha sua jogada!"}
              </p>
            </>
          )}

          {sessao.jogo === "memoria" && (
            <>
              <p className="mb-2 text-[12px] text-[#555]">
                {achadas.length === cartas.length
                  ? "Fim de jogo! 🎉"
                  : minhaVez
                    ? "Sua vez — vire duas cartas"
                    : `Vez de ${sessao.nome}…`}
              </p>
              <div className="mx-auto grid w-[260px] grid-cols-4 gap-1.5">
                {cartas.map((c, i) => {
                  const aberta = viradas.includes(i) || achadas.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`msn-carta ${aberta ? "aberta" : ""}`}
                      onClick={() => virarCarta(i)}
                      aria-label={`Carta ${i + 1}`}
                    >
                      {aberta ? c : "❔"}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
