import { useEffect, useState } from "react";
import { baixarAnexo, formatarTamanho, iconeArquivo, urlAssinada } from "@/lib/anexos";

type Props = {
  caminho: string;
  nome: string;
  tipo: string;
  tamanho: number | null;
};

export function Anexo({ caminho, nome, tipo, tamanho }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  const previa =
    tipo.startsWith("image/") || tipo.startsWith("video/") || tipo.startsWith("audio/");

  useEffect(() => {
    let vivo = true;
    if (!previa) return;
    void urlAssinada(caminho).then((u) => {
      if (vivo) setUrl(u);
    });
    return () => {
      vivo = false;
    };
  }, [caminho, previa]);

  async function baixar() {
    setBaixando(true);
    await baixarAnexo(caminho, nome);
    setBaixando(false);
  }

  return (
    <div className="msn-anexo">
      {previa && !url && <div className="msn-anexo-carregando">Carregando prévia…</div>}
      {previa && url && tipo.startsWith("image/") && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={nome} loading="lazy" className="msn-anexo-img" />
        </a>
      )}
      {previa && url && tipo.startsWith("video/") && (
        <video src={url} controls playsInline className="msn-anexo-img" />
      )}
      {previa && url && tipo.startsWith("audio/") && (
        <audio src={url} controls className="w-[220px]" />
      )}
      <div className="msn-anexo-linha">
        <span aria-hidden="true">{iconeArquivo(tipo)}</span>
        <span className="min-w-0 flex-1 truncate" title={nome}>
          {nome}
        </span>
        <span className="text-[10px] text-[#777]">{formatarTamanho(tamanho)}</span>
        <button
          type="button"
          className="msn-btn-small"
          onClick={() => void baixar()}
          disabled={baixando}
        >
          {baixando ? "…" : "⬇ Baixar"}
        </button>
      </div>
    </div>
  );
}
