import { useState } from "react";
import { FONTES, PRESETS, TEMA_PADRAO, aplicarTema, type Tema } from "@/lib/tema";

type Props = {
  tema: Tema;
  onClose: () => void;
  onSalvar: (tema: Tema) => void;
};

export function ThemeModal({ tema, onClose, onSalvar }: Props) {
  const [rascunho, setRascunho] = useState<Tema>(tema);

  function atualizar(parcial: Partial<Tema>) {
    const novo = { ...rascunho, ...parcial };
    setRascunho(novo);
    aplicarTema(novo);
  }

  return (
    <div className="msn-overlay">
      <div className="msn-window w-full max-w-[420px]">
        <div className="msn-titlebar">
          <div className="msn-titlebar-left">
            <span>🎨 Personalizar aparência</span>
          </div>
          <div className="msn-titlebar-right">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => {
                aplicarTema(tema);
                onClose();
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="msn-body max-h-[70vh] overflow-y-auto">
          <p className="msn-label">Temas prontos</p>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`msn-btn-small flex items-center gap-2 ${rascunho.preset === p.id ? "font-bold" : ""}`}
                onClick={() => atualizar({ preset: p.id, cor: p.cor, corBalao: p.corBalao })}
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-[#999]"
                  style={{ background: p.cor }}
                />
                <span className="truncate">{p.nome}</span>
              </button>
            ))}
          </div>

          <label className="msn-label" htmlFor="temaCor">
            Cor principal (janelas e botões)
          </label>
          <input
            id="temaCor"
            type="color"
            className="mb-3 h-8 w-full cursor-pointer"
            value={rascunho.cor}
            onChange={(e) => atualizar({ preset: "personalizado", cor: e.target.value })}
          />

          <label className="msn-label" htmlFor="temaBalao">
            Cor dos balões enviados
          </label>
          <input
            id="temaBalao"
            type="color"
            className="mb-3 h-8 w-full cursor-pointer"
            value={rascunho.corBalao}
            onChange={(e) => atualizar({ preset: "personalizado", corBalao: e.target.value })}
          />

          <label className="msn-label" htmlFor="temaFonte">
            Fonte
          </label>
          <select
            id="temaFonte"
            className="msn-select mb-3 w-full"
            value={rascunho.fonte}
            onChange={(e) => atualizar({ fonte: e.target.value })}
          >
            {FONTES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>

          <label className="msn-label" htmlFor="temaTamanho">
            Tamanho do texto: {rascunho.tamanho}px
          </label>
          <input
            id="temaTamanho"
            type="range"
            min={11}
            max={20}
            className="mb-3 w-full"
            value={rascunho.tamanho}
            onChange={(e) => atualizar({ tamanho: Number(e.target.value) })}
          />

          <div className="mb-3 rounded border border-[#ccc] bg-white p-2">
            <div className="msn-msg sent max-w-full">
              Prévia do seu balão de mensagem 😊
              <div className="msn-msg-time">agora ✓✓</div>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="msn-btn-small"
              onClick={() => {
                setRascunho(TEMA_PADRAO);
                aplicarTema(TEMA_PADRAO);
              }}
            >
              Restaurar padrão
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="msn-btn-small"
                onClick={() => {
                  aplicarTema(tema);
                  onClose();
                }}
              >
                Cancelar
              </button>
              <button type="button" className="msn-btn px-4" onClick={() => onSalvar(rascunho)}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
