import { useState } from "react";
import buddy from "@/assets/msn-buddy.png";
import { supabase } from "@/integrations/supabase/client";

type Achado = {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  status: string;
  ja_contato: boolean;
};

type Props = {
  onClose: () => void;
  onAdicionado: () => void;
  onGrupoCriado: (grupoId: string) => void;
};

export function BuscarModal({ onClose, onAdicionado, onGrupoCriado }: Props) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Achado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [modoGrupo, setModoGrupo] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [selecionados, setSelecionados] = useState<Achado[]>([]);
  const [aviso, setAviso] = useState("");

  async function buscar() {
    if (termo.trim().length < 2) {
      setAviso("Digite pelo menos 2 letras.");
      return;
    }
    setBuscando(true);
    setAviso("");
    const { data, error } = await supabase.rpc("buscar_usuarios", { _termo: termo.trim() });
    setBuscando(false);
    if (error) {
      setAviso("Não foi possível buscar agora.");
      return;
    }
    const lista = (data ?? []) as Achado[];
    setResultados(lista);
    if (lista.length === 0) setAviso("Ninguém encontrado com esse nome ou e-mail.");
  }

  async function adicionar(u: Achado) {
    const { error } = await supabase.rpc("adicionar_contato_id", { _alvo: u.id });
    if (error) {
      setAviso("Não foi possível adicionar.");
      return;
    }
    setResultados((r) => r.map((x) => (x.id === u.id ? { ...x, ja_contato: true } : x)));
    onAdicionado();
  }

  function alternar(u: Achado) {
    setSelecionados((s) =>
      s.some((x) => x.id === u.id) ? s.filter((x) => x.id !== u.id) : [...s, u],
    );
  }

  async function criarGrupo() {
    if (!nomeGrupo.trim()) {
      setAviso("Dê um nome ao grupo.");
      return;
    }
    const { data, error } = await supabase.rpc("criar_grupo", {
      _nome: nomeGrupo.trim(),
      _membros: selecionados.map((s) => s.id),
    });
    if (error || !data) {
      setAviso("Não foi possível criar o grupo.");
      return;
    }
    onGrupoCriado(data as string);
  }

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[440px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>{modoGrupo ? "👥 Criar grupo" : "🔎 Encontrar pessoas"}</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="msn-body">
          <div className="mb-2 flex gap-1.5">
            <button
              type="button"
              className={`msn-btn-small flex-1 ${modoGrupo ? "" : "font-bold"}`}
              onClick={() => setModoGrupo(false)}
            >
              Buscar contato
            </button>
            <button
              type="button"
              className={`msn-btn-small flex-1 ${modoGrupo ? "font-bold" : ""}`}
              onClick={() => setModoGrupo(true)}
            >
              Criar grupo
            </button>
          </div>

          {modoGrupo && (
            <>
              <label className="msn-label" htmlFor="nomeGrupo">
                Nome do grupo
              </label>
              <input
                id="nomeGrupo"
                className="msn-input mb-2"
                maxLength={60}
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                placeholder="Ex.: Galera do colégio"
              />
              {selecionados.length > 0 && (
                <p className="mb-2 text-[11px] text-[#333]">
                  Membros: {selecionados.map((s) => s.nome).join(", ")}
                </p>
              )}
            </>
          )}

          <label className="msn-label" htmlFor="termoBusca">
            Nome ou e-mail
          </label>
          <div className="mb-2 flex gap-1.5">
            <input
              id="termoBusca"
              className="msn-input flex-1"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void buscar();
                }
              }}
              placeholder="Digite ao menos 2 letras"
            />
            <button type="button" className="msn-btn px-4" onClick={() => void buscar()}>
              {buscando ? "…" : "Buscar"}
            </button>
          </div>

          {aviso && <p className="mb-2 text-[11px] text-[#b00]">{aviso}</p>}

          <div className="max-h-[40vh] overflow-y-auto">
            {resultados.map((u) => {
              const marcado = selecionados.some((s) => s.id === u.id);
              return (
                <div key={u.id} className="flex items-center gap-2 border-b border-[#eee] py-1.5">
                  <img
                    src={u.avatar_url || buddy}
                    alt=""
                    width={32}
                    height={32}
                    className="msn-contact-avatar"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-[#333]">{u.nome}</div>
                    <div className="truncate text-[10px] text-[#777]">{u.email}</div>
                  </div>
                  {modoGrupo ? (
                    <button
                      type="button"
                      className="msn-btn-small"
                      onClick={() => alternar(u)}
                    >
                      {marcado ? "✓ Escolhido" : "+ Incluir"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="msn-btn-small"
                      disabled={u.ja_contato}
                      onClick={() => void adicionar(u)}
                    >
                      {u.ja_contato ? "Já é contato" : "+ Adicionar"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {modoGrupo && (
            <div className="mt-3 flex justify-end">
              <button type="button" className="msn-btn px-4" onClick={() => void criarGrupo()}>
                Criar grupo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}