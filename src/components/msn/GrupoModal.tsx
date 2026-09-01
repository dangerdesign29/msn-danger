import { useCallback, useEffect, useState } from "react";

import buddy from "@/assets/msn-buddy.png";
import { supabase } from "@/integrations/supabase/client";
import type { Contato, Grupo } from "@/lib/msn";

type Membro = {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  status: string;
};

type Props = {
  grupo: Grupo;
  contatos: Contato[];
  onClose: () => void;
  onMudou: () => void;
  onSaiu: () => void;
};

export function GrupoModal({ grupo, contatos, onClose, onMudou, onSaiu }: Props) {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc("membros_grupo", { _grupo: grupo.id });
    setMembros((data ?? []) as Membro[]);
  }, [grupo.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function adicionar(contatoId: string) {
    const { data, error } = await supabase.rpc("adicionar_membro", {
      _grupo: grupo.id,
      _usuario: contatoId,
    });
    if (error || data !== "ok") {
      setAviso("Não foi possível adicionar essa pessoa.");
      return;
    }
    await carregar();
    onMudou();
  }

  async function sair() {
    await supabase.rpc("sair_grupo", { _grupo: grupo.id });
    onSaiu();
  }

  const foraDoGrupo = contatos.filter((c) => !membros.some((m) => m.id === c.id));

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[420px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>👥 {grupo.nome}</span>
          </div>
          <div className="msn-titlebar-right">
            <button type="button" aria-label="Fechar" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="msn-body">
          <p className="msn-label">Membros ({membros.length})</p>
          <div className="mb-3 max-h-[28vh] overflow-y-auto">
            {membros.map((m) => (
              <div key={m.id} className="flex items-center gap-2 border-b border-[#eee] py-1.5">
                <img
                  src={m.avatar_url || buddy}
                  alt=""
                  width={28}
                  height={28}
                  className="msn-contact-avatar"
                />
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#333]">{m.nome}</span>
                <span className={`msn-contact-status ${m.status}`}>{m.status}</span>
              </div>
            ))}
          </div>

          <p className="msn-label">Adicionar dos meus contatos</p>
          <div className="max-h-[24vh] overflow-y-auto">
            {foraDoGrupo.length === 0 && (
              <p className="py-2 text-[11px] text-[#888]">Todos os seus contatos já estão aqui.</p>
            )}
            {foraDoGrupo.map((c) => (
              <div key={c.id} className="flex items-center gap-2 border-b border-[#eee] py-1.5">
                <img
                  src={c.avatar_url || buddy}
                  alt=""
                  width={28}
                  height={28}
                  className="msn-contact-avatar"
                />
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#333]">
                  {c.apelido ?? c.nome}
                </span>
                <button
                  type="button"
                  className="msn-btn-small"
                  onClick={() => void adicionar(c.id)}
                >
                  + Incluir
                </button>
              </div>
            ))}
          </div>

          {aviso && <p className="mt-2 text-[11px] text-[#b00]">{aviso}</p>}

          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="msn-btn-small" onClick={() => void sair()}>
              🚪 Sair do grupo
            </button>
            <button type="button" className="msn-btn px-4" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
